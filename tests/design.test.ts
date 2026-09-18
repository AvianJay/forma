import { describe, expect, it } from 'vitest';
import {
  CDN_PREFIX,
  countComponents,
  designSchema,
  initialDesign,
  normalizeMediaUrl,
  payloadSchema,
} from '../src/shared/design';

const payload = (components: unknown[]) => ({ component: { type: 17, components } });
describe('Discord payload validation', () => {
  it('accepts the complete supported read-only subset', () => {
    const value = payload([
      { type: 10, content: '# Hello' },
      {
        type: 9,
        components: [{ type: 10, content: 'Caption' }],
        accessory: { type: 11, media: { url: 'https://example.com/a.png' }, spoiler: true },
      },
      {
        type: 9,
        components: [{ type: 10, content: 'Link' }],
        accessory: { type: 2, style: 5, url: 'https://example.com', emoji: { name: '✨' } },
      },
      { type: 12, items: [{ media: { url: 'https://example.com/a.mp4' } }] },
      { type: 14, spacing: 2, divider: false },
      {
        type: 1,
        components: [
          { type: 2, style: 5, label: 'Link', url: 'https://example.com', disabled: true },
        ],
      },
    ]);
    expect(payloadSchema.safeParse(value).success).toBe(true);
  });
  it('counts root, children, row buttons and section accessories (40/41 boundary)', () => {
    const sections = Array.from({ length: 13 }, () => ({
      type: 9,
      components: [{ type: 10, content: 'x' }],
      accessory: { type: 2, style: 5, url: 'https://example.com', label: 'x' },
    }));
    const valid = payloadSchema.parse(payload(sections));
    expect(countComponents(valid.component)).toBe(40);
    expect(
      payloadSchema.safeParse(payload([...sections, { type: 10, content: '41' }])).success,
    ).toBe(false);
  });
  it.each(['id', 'custom_id', 'sku_id'])('rejects forbidden button field %s', (key) => {
    expect(
      payloadSchema.safeParse(
        payload([
          {
            type: 1,
            components: [{ type: 2, style: 5, label: 'x', url: 'https://example.com', [key]: 123 }],
          },
        ]),
      ).success,
    ).toBe(false);
  });
  it.each([
    [{ type: 11, media: { url: 'https://example.com/a.png' } }],
    [{ type: 17, components: [{ type: 10, content: 'nested' }] }],
    [{ type: 3, custom_id: 'select' }],
    [{ type: 1, components: [{ type: 10, content: 'invalid child' }] }],
    [{ type: 9, components: [{ type: 10, content: 'missing accessory' }] }],
    [{ type: 12, items: [] }],
    [
      {
        type: 12,
        items: Array.from({ length: 11 }, () => ({ media: { url: 'https://example.com/a.png' } })),
      },
    ],
    [
      {
        type: 1,
        components: Array.from({ length: 6 }, () => ({
          type: 2,
          style: 5,
          label: 'x',
          url: 'https://example.com',
        })),
      },
    ],
  ])('rejects invalid structure %j', (...components) => {
    expect(payloadSchema.safeParse(payload(components)).success).toBe(false);
  });
  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,x',
    'attachment://x',
    'ftp://example.com/a',
    'https://user:pass@example.com/a',
    'not a URL',
  ])('rejects unsafe media URL %s', (url) => {
    expect(
      payloadSchema.safeParse(payload([{ type: 12, items: [{ media: { url } }] }])).success,
    ).toBe(false);
  });
  it('enforces button label and URL bounds and media URL limit', () => {
    const row = {
      type: 1,
      components: [{ type: 2, style: 5, label: 'x'.repeat(81), url: 'https://example.com' }],
    };
    expect(payloadSchema.safeParse(payload([row])).success).toBe(false);
    row.components[0].label = 'x';
    row.components[0].url += '/' + 'a'.repeat(512);
    expect(payloadSchema.safeParse(payload([row])).success).toBe(false);
    expect(
      payloadSchema.safeParse(
        payload([
          {
            type: 12,
            items: [{ media: { url: 'https://cdn.discordapp.com/' + 'a'.repeat(2010) } }],
          },
        ]),
      ).success,
    ).toBe(false);
  });
});

describe('Discord CDN normalization', () => {
  it.each([
    'cdn.discordapp.com',
    'media.discordapp.net',
    'images-ext-1.discordapp.net',
    'images-ext-2.discordapp.net',
  ])('prefixes %s exactly once and preserves signed queries', (host) => {
    const url = `https://${host}/attachments/123/test.png?ex=abc&is=def&hm=ghi`;
    expect(normalizeMediaUrl(url)).toBe(CDN_PREFIX + url);
    expect(normalizeMediaUrl(normalizeMediaUrl(url))).toBe(CDN_PREFIX + url);
  });
  it('does not match spoofed domains, path text, non-HTTP schemes or ordinary hosts', () => {
    for (const url of [
      'https://cdn.discordapp.com.evil.test/a',
      'https://example.com/cdn.discordapp.com',
      'https://example.com/a',
      'ftp://cdn.discordapp.com/a',
      'https://user:pass@cdn.discordapp.com/a',
    ])
      expect(normalizeMediaUrl(url)).toBe(url);
  });
  it('normalizes gallery, thumbnail, and OG image but leaves navigation buttons alone', () => {
    const url = 'https://cdn.discordapp.com/attachments/a.png';
    const design = designSchema.parse({
      ...initialDesign,
      image: url,
      component: {
        type: 17,
        components: [
          {
            type: 9,
            components: [{ type: 10, content: 'x' }],
            accessory: { type: 11, media: { url } },
          },
          { type: 12, items: [{ media: { url } }] },
          { type: 1, components: [{ type: 2, style: 5, label: 'x', url }] },
        ],
      },
    });
    expect(design.image).toBe(CDN_PREFIX + url);
    expect(JSON.stringify(design.component).split(CDN_PREFIX)).toHaveLength(3);
    expect(design.component.components[2]).toMatchObject({ components: [{ url }] });
  });
});
