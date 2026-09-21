import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import worker, { createLink, hashToken, type Env } from '../src/worker/index';
import { designSchema, initialDesign, MAX_BODY_BYTES, payloadSchema } from '../src/shared/design';
import { withLinksTable } from '../src/worker/database';
import { homepageDesign } from '../src/shared/homepage';

let mf: Miniflare;
let env: Env;
const limiter = vi.fn(async () => ({ success: true }));
const request = (path: string, method = 'GET', body?: unknown, token?: string) =>
  new Request(`https://forma.test${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
async function create(testEnv = env) {
  const response = await worker.fetch(request('/api/links', 'POST', initialDesign), testEnv);
  expect(response.status).toBe(201);
  const data = (await response.json()) as { id: string; url: string; manageUrl: string };
  const token = new URLSearchParams(new URL(data.manageUrl).hash.slice(1)).get('token')!;
  return { ...data, token };
}
beforeAll(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default { fetch() { return new Response("test"); } }',
      compatibilityDate: '2026-09-18',
      d1Databases: ['DB', 'EMPTY_WRITE_DB', 'EMPTY_READ_DB', 'CONCURRENT_DB'],
    }),
  );
  const db = await mf.getD1Database('DB');
  await db
    .prepare(await readFile(new URL('../migrations/0001_links.sql', import.meta.url), 'utf8'))
    .run();
  env = {
    DB: db as unknown as D1Database,
    WRITE_LIMITER: { limit: limiter },
    ASSETS: { fetch: async () => new Response('spa') },
  };
});
beforeEach(async () => {
  await env.DB.prepare('DELETE FROM links').run();
  limiter.mockResolvedValue({ success: true });
  limiter.mockClear();
});
afterAll(async () => {
  await mf?.dispose();
});

describe('Worker with real local D1', () => {
  it('creates a link in an unmigrated bound database, then safely applies the migration', async () => {
    const db = (await mf.getD1Database('EMPTY_WRITE_DB')) as unknown as D1Database;
    const fresh = { ...env, DB: db };
    const link = await create(fresh);
    const path = `/api/links/${link.id}`;
    expect((await worker.fetch(request(path), fresh)).status).toBe(200);
    await db
      .prepare(await readFile(new URL('../migrations/0001_links.sql', import.meta.url), 'utf8'))
      .run();
    expect((await worker.fetch(request(path), fresh)).status).toBe(200);
    expect(
      (
        await worker.fetch(
          request(path, 'PUT', { ...initialDesign, title: 'After migration' }, link.token),
          fresh,
        )
      ).status,
    ).toBe(200);
  });
  it('returns 404 rather than 500 when the first request reads an empty database', async () => {
    const db = (await mf.getD1Database('EMPTY_READ_DB')) as unknown as D1Database;
    const fresh = { ...env, DB: db };
    expect((await worker.fetch(request('/api/links/AAAAAAAAAA'), fresh)).status).toBe(404);
    expect((await worker.fetch(request('/s/AAAAAAAAAA'), fresh)).status).toBe(404);
  });
  it('handles concurrent first writes without losing records', async () => {
    const db = (await mf.getD1Database('CONCURRENT_DB')) as unknown as D1Database;
    const links = await Promise.all(Array.from({ length: 4 }, () => createLink(db, initialDesign)));
    expect(new Set(links.map((link) => link.id)).size).toBe(4);
    expect(await db.prepare('SELECT COUNT(*) AS total FROM links').first('total')).toBe(4);
  });
  it('does not create tables or swallow unrelated database failures', async () => {
    const prepare = vi.fn();
    const db = { prepare } as unknown as D1Database;
    for (const message of [
      'D1_ERROR: no such column: missing: SQLITE_ERROR',
      'D1_ERROR: no such table: another_table: SQLITE_ERROR',
      'D1_ERROR: database unavailable',
    ]) {
      const operation = vi.fn().mockRejectedValue(new Error(message));
      await expect(withLinksTable(db, operation)).rejects.toThrow(message);
      expect(operation).toHaveBeenCalledTimes(1);
    }
    expect(prepare).not.toHaveBeenCalled();
  });
  it('reports missing deployment bindings without exposing raw errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const noDb = { ...env, DB: undefined } as unknown as Env;
      const missingDb = await worker.fetch(request('/api/links/AAAAAAAAAA'), noDb);
      expect(missingDb.status).toBe(503);
      expect(await missingDb.json()).toMatchObject({ code: 'database_binding_missing' });
      const noLimiter = { ...env, WRITE_LIMITER: undefined } as unknown as Env;
      const missingLimiter = await worker.fetch(
        request('/api/links', 'POST', initialDesign),
        noLimiter,
      );
      expect(missingLimiter.status).toBe(503);
      expect(await missingLimiter.json()).toMatchObject({ code: 'rate_limiter_binding_missing' });
    } finally {
      log.mockRestore();
    }
  });
  it('creates an immediately readable link and stores only a token hash', async () => {
    const link = await create();
    expect(link.id).toMatch(/^[a-zA-Z0-9]{10}$/);
    expect(link.token).toHaveLength(43);
    const row = await env.DB.prepare('SELECT * FROM links WHERE id = ?')
      .bind(link.id)
      .first<{ token_hash: string }>();
    expect(row?.token_hash).toBe(await hashToken(link.token));
    expect(JSON.stringify(row)).not.toContain(link.token);
    const response = await worker.fetch(request(`/api/links/${link.id}`), env);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const publicData = await response.text();
    expect(publicData).not.toContain(link.token);
    expect(publicData).not.toContain('token_hash');
    expect(JSON.parse(publicData).design).toEqual(initialDesign);
  });
  it('authorizes updates and deletion, rejects invalid tokens, and returns 404 after deletion', async () => {
    const link = await create();
    const path = `/api/links/${link.id}`;
    expect((await worker.fetch(request(path, 'PUT', initialDesign), env)).status).toBe(401);
    expect(
      (await worker.fetch(request(path, 'DELETE', undefined, 'x'.repeat(43)), env)).status,
    ).toBe(401);
    const updated = { ...initialDesign, title: 'Updated title' };
    expect((await worker.fetch(request(path, 'PUT', updated, link.token), env)).status).toBe(200);
    expect(await (await worker.fetch(request(`/s/${link.id}`), env)).text()).toContain(
      'Updated title',
    );
    expect((await worker.fetch(request(path, 'DELETE', undefined, link.token), env)).status).toBe(
      204,
    );
    expect((await worker.fetch(request(path), env)).status).toBe(404);
    expect((await worker.fetch(request(`/s/${link.id}`), env)).status).toBe(404);
  });
  it('retries ID collisions without overwriting another link', async () => {
    const first = await createLink(env.DB, initialDesign, () => 'AAAAAAAAAA');
    const generator = vi.fn().mockReturnValueOnce(first.id).mockReturnValue('BBBBBBBBBB');
    const second = await createLink(env.DB, { ...initialDesign, title: 'second' }, generator);
    expect(generator).toHaveBeenCalledTimes(2);
    expect(second.id).toBe('BBBBBBBBBB');
    const row = await env.DB.prepare('SELECT token_hash FROM links WHERE id = ?')
      .bind(first.id)
      .first<{ token_hash: string }>();
    expect(row?.token_hash).toBe(await hashToken(first.token));
  });
  it('limits writes, leaves reads unthrottled, and rejects cross-origin writes', async () => {
    const link = await create();
    limiter.mockResolvedValue({ success: false });
    for (const [path, method] of [
      ['/api/links', 'POST'],
      [`/api/links/${link.id}`, 'PUT'],
      [`/api/links/${link.id}`, 'DELETE'],
    ]) {
      const response = await worker.fetch(
        request(path, method, method === 'DELETE' ? undefined : initialDesign, link.token),
        env,
      );
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    }
    expect((await worker.fetch(request(`/s/${link.id}`), env)).status).toBe(200);
    expect((await worker.fetch(request(`/api/links/${link.id}`), env)).status).toBe(200);
    const foreign = request('/api/links', 'POST', initialDesign);
    foreign.headers.set('Origin', 'https://other.test');
    expect((await worker.fetch(foreign, env)).status).toBe(403);
  });
  it('returns field errors, bad JSON, oversized requests and proper missing routes', async () => {
    const invalid = await worker.fetch(
      request('/api/links', 'POST', { ...initialDesign, title: '' }),
      env,
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.text()).toContain('title');
    expect(
      (
        await worker.fetch(
          new Request('https://forma.test/api/links', {
            method: 'POST',
            body: '{',
            headers: { 'Content-Type': 'application/json' },
          }),
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await worker.fetch(
          request('/api/links', 'POST', { extra: 'a'.repeat(MAX_BODY_BYTES) }),
          env,
        )
      ).status,
    ).toBe(413);
    expect((await worker.fetch(request('/s/invalid'), env)).status).toBe(404);
    expect((await worker.fetch(request('/api/unknown'), env)).status).toBe(404);
    expect(await (await worker.fetch(request('/manage/AAAAAAAAAA'), env)).text()).toBe('spa');
  });
  it('localizes API errors and server-rendered pages per request', async () => {
    const invalid = await worker.fetch(
      request('/api/links?lang=en', 'POST', { ...initialDesign, title: '' }),
      env,
    );
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get('Content-Language')).toBe('en');
    expect(invalid.headers.get('Set-Cookie')).toContain('forma_locale=en');
    expect(await invalid.text()).toContain('Enter a preview title');

    const detected = request('/api/unknown');
    detected.headers.set('Accept-Language', 'fr-FR, en;q=0.8');
    const detectedResponse = await worker.fetch(detected, env);
    expect(detectedResponse.headers.get('Content-Language')).toBe('en');
    expect(await detectedResponse.text()).toContain('Link not found');

    const stored = request('/api/unknown');
    stored.headers.set('Cookie', 'forma_locale=zh-Hant');
    stored.headers.set('Accept-Language', 'en-US');
    const storedResponse = await worker.fetch(stored, env);
    expect(storedResponse.headers.get('Content-Language')).toBe('zh-Hant');
    expect(await storedResponse.text()).toContain('找不到此連結');

    const link = await create();
    const publicResponse = await worker.fetch(request('/s/' + link.id + '?lang=en'), env);
    const publicBody = await publicResponse.text();
    expect(publicResponse.headers.get('Content-Language')).toBe('en');
    expect(publicBody).toContain('<html lang="en">');
    expect(publicBody).toContain('This page contains user-created content.');
    expect(publicBody).toContain('把好點子，分享出去。');
  });
  it('serves crawler HTML without JS, escapes JSON and HTML, and keeps secrets out', async () => {
    const attack = '</script><script>alert("xss")</script> & <img src=x onerror=alert(1)>';
    const design = {
      ...initialDesign,
      title: attack,
      description: attack,
      component: {
        type: 17 as const,
        components: [{ type: 10 as const, content: attack + '\n[bad](javascript:alert%281%29)' }],
      },
    };
    const link = await createLink(env.DB, design);
    const req = request(`/s/${link.id}`);
    req.headers.set(
      'User-Agent',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    );
    const response = await worker.fetch(req, env);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('property="og:title"');
    expect(body).toContain('class="discord-card"');
    expect(body).toContain(
      '<aside class="user-content-notice" role="note">此頁面內容由使用者建立。</aside>',
    );
    expect(body).not.toContain('<script>alert');
    expect(body).not.toContain('href="javascript:');
    expect(body).not.toContain('<img src="x"');
    expect(body).not.toContain(link.token);
    const script =
      /<script id="discord:component-embed" type="application\/json">([\s\S]*?)<\/script>/.exec(
        body,
      )!;
    expect(JSON.parse(script[1])).toEqual({ component: design.component });
    const head = await worker.fetch(request(`/s/${link.id}`, 'HEAD'), env);
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });
  it('normalizes Discord CDN URLs on direct API writes', async () => {
    const response = await worker.fetch(
      request('/api/links', 'POST', {
        ...initialDesign,
        image: 'https://cdn.discordapp.com/attachments/a.png?ex=x&hm=y',
      }),
      env,
    );
    const data = (await response.json()) as { id: string };
    const read = await worker.fetch(request(`/api/links/${data.id}`), env);
    expect(await read.text()).toContain(
      'https://dccdngen.avianjay.sbs/https://cdn.discordapp.com/attachments/a.png?ex=x&hm=y',
    );
  });
});

describe('homepage component embed', () => {
  it('adds valid CV2 and Open Graph metadata to the initial HTML while preserving the editor', async () => {
    const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const homepageEnv = {
      ...env,
      DB: undefined,
      WRITE_LIMITER: undefined,
      ASSETS: {
        fetch: async () =>
          new Response(source, {
            headers: {
              'Content-Type': 'text/html',
              ETag: '"static-editor"',
              'Content-Length': String(source.length),
            },
          }),
      },
    } as unknown as Env;
    for (const path of ['/', '/?utm_source=discord', '/index.html']) {
      const req = request(path);
      req.headers.set('User-Agent', 'Discordbot/2.0');
      const response = await worker.fetch(req, homepageEnv);
      expect(response.status).toBe(200);
      expect(response.headers.get('ETag')).toBeNull();
      expect(response.headers.get('Content-Length')).toBeNull();
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      const body = await response.text();
      expect(body).toContain('<div id="root"></div>');
      expect(body).toContain('src="/src/client/main.tsx"');
      expect(body).toContain('property="og:type" content="website"');
      expect(body).toContain('property="og:url" content="https://forma.test/"');
      const script =
        /<script id="discord:component-embed" type="application\/json">([\s\S]*?)<\/script>/.exec(
          body,
        )!;
      const parsed = payloadSchema.parse(JSON.parse(script[1]));
      expect(parsed).toEqual({ component: homepageDesign('https://forma.test').component });
      expect(designSchema.safeParse(homepageDesign('https://forma.test')).success).toBe(true);
    }
    const englishResponse = await worker.fetch(request('/?lang=en'), homepageEnv);
    const englishBody = await englishResponse.text();
    expect(englishResponse.headers.get('Content-Language')).toBe('en');
    expect(englishBody).toContain('<html lang="en">');
    expect(englishBody).toContain('Forma — Discord Link Designer');
    const englishScript =
      /<script id="discord:component-embed" type="application\/json">([\s\S]*?)<\/script>/.exec(
        englishBody,
      )!;
    expect(payloadSchema.parse(JSON.parse(englishScript[1]))).toEqual({
      component: homepageDesign('https://forma.test', 'en').component,
    });
    const head = await worker.fetch(request('/', 'HEAD'), homepageEnv);
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });
});
