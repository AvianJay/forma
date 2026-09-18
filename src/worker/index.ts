import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { designSchema, issuesFrom, MAX_BODY_BYTES, type Design } from '../shared/design';
import { Preview } from '../shared/Preview';
import previewStyles from '../shared/preview.css?inline';
import { homepageDesign } from '../shared/homepage';
import { ServiceConfigurationError, withLinksTable } from './database';

export interface Env {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
  WRITE_LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
type LinkRow = {
  id: string;
  design_json: string;
  token_hash: string;
  created_at: string;
  updated_at: string;
};
const commonHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...commonHeaders, ...headers } });

export function shortId(): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  // Rejection sampling avoids modulo bias with the 62-character alphabet.
  while (result.length < 10)
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < 248) result += alphabet[byte % 62];
      if (result.length === 10) break;
    }
  return result;
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function createToken(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export async function createLink(db: D1Database, design: Design, generateId = shortId) {
  const token = createToken();
  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = generateId();
    const result = await withLinksTable(db, () =>
      db
        .prepare(
          'INSERT INTO links (id, design_json, token_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
        )
        .bind(id, JSON.stringify(design), tokenHash, now, now)
        .run(),
    );
    if (result.meta.changes === 1) return { id, token, createdAt: now };
  }
  throw new Error('Could not allocate a unique link ID');
}

class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
async function readDesign(request: Request) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))
    throw new RequestError('請使用 application/json');
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError('請提供設計 JSON');
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestError('內容不可超過 64 KiB', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch {
    throw new RequestError('JSON 格式錯誤');
  }
}

function htmlEscape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}

export function renderMetadata(
  design: Design,
  url: string,
  type: 'article' | 'website' = 'article',
): string {
  const payload = JSON.stringify({ component: design.component })
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  return `<meta property="og:title" content="${htmlEscape(design.title)}"><meta property="og:description" content="${htmlEscape(design.description)}"><meta property="og:url" content="${htmlEscape(url)}"><meta property="og:type" content="${type}">
${design.image ? `<meta property="og:image" content="${htmlEscape(design.image)}">` : ''}<meta name="twitter:card" content="${design.image ? 'summary_large_image' : 'summary'}">
<script id="discord:component-embed" type="application/json">${payload}</script>`;
}

export function renderPage(design: Design, url: string): string {
  const content = renderToStaticMarkup(createElement(Preview, { component: design.component }));
  const title = htmlEscape(design.title);
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Forma</title>
${renderMetadata(design, url)}<link rel="icon" href="/favicon.svg"><style>${previewStyles}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#101113;color:#f1f1f3;font-family:system-ui,sans-serif;padding:48px 20px}main{max-width:560px;margin:60px auto}header{display:flex;gap:10px;align-items:center;font-weight:700;letter-spacing:-.5px}header img{width:30px;height:30px}.user-content-notice{margin-bottom:16px;padding:10px 12px;border:1px solid #34363d;border-radius:8px;background:#191a1f;color:#a6a8af;font-size:12px;line-height:1.5}footer{margin-top:24px;font-size:12px;color:#8d8f97}footer a{color:#bef264}h1{font-size:14px;color:#a6a8af;margin-bottom:20px}</style><script src="/media-fallback.js" defer></script></head>
<body><header><img src="/favicon.svg" alt="">forma<span style="font-weight:400;color:#737780">/ 連結分享</span></header><main><aside class="user-content-notice" role="note">此頁面內容由使用者建立。</aside><h1>${title}</h1>${content}<footer>使用 <a href="/">Forma</a>，把你的點子變成一個連結。</footer></main></body></html>`;
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...commonHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy':
        "default-src 'none'; img-src http: https:; media-src http: https:; style-src 'unsafe-inline'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    },
  });
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const isApi = path === '/api' || path.startsWith('/api/');
  const isPage = path === '/s' || path.startsWith('/s/');
  if ((path === '/' || path === '/index.html') && ['GET', 'HEAD'].includes(request.method)) {
    const asset = await env.ASSETS.fetch(new Request(request, { method: 'GET' }));
    if (!asset.ok || !asset.headers.get('Content-Type')?.includes('text/html')) return asset;
    const source = await asset.text();
    const metadata = renderMetadata(homepageDesign(url.origin), `${url.origin}/`, 'website');
    const headers = new Headers(asset.headers);
    for (const name of ['Content-Length', 'Content-Encoding', 'ETag', 'Last-Modified'])
      headers.delete(name);
    for (const [name, value] of Object.entries(commonHeaders)) headers.set(name, value);
    // This is our own Vite-built HTML template, not user-supplied markup. Preserve all
    // editor scripts/styles while adding crawler-readable metadata to the real response.
    return new Response(
      request.method === 'HEAD' ? null : source.replace(/<\/head>/i, () => `${metadata}</head>`),
      { status: asset.status, headers },
    );
  }
  if (!isApi && !isPage) return env.ASSETS.fetch(request);
  const publicMatch = /^\/s\/([A-Za-z0-9]{10})$/.exec(path);
  const itemMatch = /^\/api\/links\/([A-Za-z0-9]{10})$/.exec(path);
  const create = path === '/api/links' && request.method === 'POST';
  if (!create && !publicMatch && !itemMatch)
    return isApi
      ? json({ error: '找不到此連結' }, 404)
      : html(
          '<!doctype html><meta charset="utf-8"><title>找不到連結</title><h1>連結不存在或已被刪除</h1><a href="/">建立新連結</a>',
          404,
        );
  const write = create || (!!itemMatch && ['PUT', 'DELETE'].includes(request.method));
  if (write) {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ error: '不允許跨網站寫入' }, 403);
    if (!env.WRITE_LIMITER || typeof env.WRITE_LIMITER.limit !== 'function') {
      throw new ServiceConfigurationError('rate_limiter_binding_missing');
    }
    const { success } = await env.WRITE_LIMITER.limit({
      key: request.headers.get('CF-Connecting-IP') || 'local-development',
    });
    if (!success)
      return json({ error: '操作太頻繁，請在一分鐘後再試' }, 429, { 'Retry-After': '60' });
  }
  if (create) {
    const parsed = designSchema.safeParse(await readDesign(request));
    if (!parsed.success)
      return json({ error: '設計內容有誤', issues: issuesFrom(parsed.error) }, 400);
    const link = await createLink(env.DB, parsed.data);
    return json(
      {
        id: link.id,
        url: `${url.origin}/s/${link.id}`,
        manageUrl: `${url.origin}/manage/${link.id}#token=${link.token}`,
        createdAt: link.createdAt,
      },
      201,
    );
  }
  const id = (publicMatch || itemMatch)![1];
  const row = await withLinksTable(env.DB, () =>
    env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(id).first<LinkRow>(),
  );
  if (!row)
    return isApi
      ? json({ error: '找不到此連結' }, 404)
      : html(
          '<!doctype html><meta charset="utf-8"><title>找不到連結</title><h1>連結不存在或已被刪除</h1><a href="/">建立新連結</a>',
          404,
        );
  if (request.method === 'GET' || request.method === 'HEAD') {
    const design = JSON.parse(row.design_json) as Design;
    const response = publicMatch
      ? html(renderPage(design, `${url.origin}/s/${id}`))
      : json({ id, design, createdAt: row.created_at, updatedAt: row.updated_at });
    return request.method === 'HEAD'
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  }
  if (publicMatch || !['PUT', 'DELETE'].includes(request.method))
    return json({ error: '不支援此操作' }, 405, {
      Allow: publicMatch ? 'GET, HEAD' : 'GET, HEAD, PUT, DELETE',
    });
  const token = request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!token || (await hashToken(token)) !== row.token_hash)
    return json({ error: '管理密鑰無效，請使用完整的私人管理連結' }, 401);
  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
    return new Response(null, { status: 204, headers: commonHeaders });
  }
  const parsed = designSchema.safeParse(await readDesign(request));
  if (!parsed.success)
    return json({ error: '設計內容有誤', issues: issuesFrom(parsed.error) }, 400);
  const updatedAt = new Date().toISOString();
  const result = await env.DB.prepare(
    'UPDATE links SET design_json = ?, updated_at = ? WHERE id = ?',
  )
    .bind(JSON.stringify(parsed.data), updatedAt, id)
    .run();
  if (!result.meta.changes) return json({ error: '找不到此連結' }, 404);
  return json({ id, url: `${url.origin}/s/${id}`, updatedAt });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status);
      if (error instanceof ServiceConfigurationError) {
        console.error('Link service configuration error', { category: error.code });
        return json({ error: error.message, code: error.code }, 503);
      }
      // Never log request bodies, authorization headers, or generated management URLs.
      console.error('Link request failed', {
        method: request.method,
        category:
          error instanceof Error && /D1_ERROR/.test(error.message)
            ? 'database_error'
            : 'internal_error',
      });
      return json({ error: '服務暫時無法處理，請稍後再試' }, 500);
    }
  },
};
