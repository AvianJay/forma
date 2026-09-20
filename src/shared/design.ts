import { z } from 'zod';

export const CDN_PREFIX = 'https://dccdngen.avianjay.sbs/';
export const MAX_BODY_BYTES = 64 * 1024;
export const DOC_REVISION = '20b7c0d2a7c30fd455d3e8f6e58c8ab42eeb2849';

export function normalizeMediaUrl(value: string): string {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.hostname === 'cdn.discordapp.com' &&
      !url.port &&
      url.pathname.startsWith('/attachments/')
    ) {
      return CDN_PREFIX + trimmed;
    }
  } catch {
    /* Validation reports incomplete URLs while editing. */
  }
  return trimmed;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password
    );
  } catch {
    return false;
  }
}

const httpUrl = (max: number) =>
  z
    .string()
    .trim()
    .min(1, '請填寫網址')
    .max(max, `網址不可超過 ${max} 字元`)
    .refine(isHttpUrl, '請輸入完整 HTTP 或 HTTPS 網址（不可包含帳號密碼）');
const mediaUrl = httpUrl(2048).transform(normalizeMediaUrl).pipe(httpUrl(2048));
const id = z.number().int().min(0).max(2147483647).optional();
const description = z.string().max(1024).nullable().optional();
const media = z.strictObject({ url: mediaUrl });
export const textSchema = z.strictObject({
  type: z.literal(10),
  id,
  content: z.string().min(1, '文字不可空白').max(4000, '文字不可超過 4,000 字元'),
});
export const buttonSchema = z
  .strictObject({
    type: z.literal(2),
    style: z.literal(5),
    url: httpUrl(512),
    label: z.string().min(1).max(80).optional(),
    emoji: z
      .strictObject({
        name: z.string().min(1).max(100).optional(),
        id: z
          .string()
          .regex(/^\d{1,20}$/)
          .nullable()
          .optional(),
        animated: z.boolean().optional(),
      })
      .refine((e) => !!e.name || !!e.id, '請填寫 emoji 名稱或 ID')
      .optional(),
    disabled: z.boolean().optional(),
  })
  .refine((b) => !!b.label || !!b.emoji, '按鈕需要標籤或 emoji');
export const thumbnailSchema = z.strictObject({
  type: z.literal(11),
  id,
  media,
  description,
  spoiler: z.boolean().optional(),
});
export const sectionSchema = z.strictObject({
  type: z.literal(9),
  id,
  components: z.array(textSchema).min(1).max(3),
  accessory: z.union([buttonSchema, thumbnailSchema]),
});
export const rowSchema = z.strictObject({
  type: z.literal(1),
  id,
  components: z.array(buttonSchema).min(1).max(5),
});
export const gallerySchema = z.strictObject({
  type: z.literal(12),
  id,
  items: z
    .array(z.strictObject({ media, description, spoiler: z.boolean().optional() }))
    .min(1)
    .max(10),
});
export const separatorSchema = z.strictObject({
  type: z.literal(14),
  id,
  divider: z.boolean().optional(),
  spacing: z.union([z.literal(1), z.literal(2)]).optional(),
});
export const childSchema = z.union([
  textSchema,
  sectionSchema,
  rowSchema,
  gallerySchema,
  separatorSchema,
]);
export const containerSchema = z.strictObject({
  type: z.literal(17),
  id,
  accent_color: z.number().int().min(0).max(0xffffff).nullable().optional(),
  spoiler: z.boolean().optional(),
  components: z.array(childSchema).min(1, '至少新增一個元件').max(39),
});

export type Text = z.infer<typeof textSchema>;
export type Button = z.infer<typeof buttonSchema>;
export type Thumbnail = z.infer<typeof thumbnailSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Gallery = z.infer<typeof gallerySchema>;
export type Row = z.infer<typeof rowSchema>;
export type Child = z.infer<typeof childSchema>;
export type Container = z.infer<typeof containerSchema>;

export function countComponents(container: Container): number {
  return (
    1 +
    container.components.reduce(
      (count, child) =>
        count +
        1 +
        (child.type === 9
          ? child.components.length + 1
          : child.type === 1
            ? child.components.length
            : 0),
      0,
    )
  );
}

export const payloadSchema = z
  .strictObject({ component: containerSchema })
  .superRefine(({ component }, ctx) => {
    if (countComponents(component) > 40)
      ctx.addIssue({
        code: 'custom',
        path: ['component'],
        message: '包含容器與附屬元件，最多 40 個元件',
      });
  });
export const designSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    component: containerSchema,
    title: z.string().trim().min(1, '請填寫預覽標題').max(200),
    description: z.string().max(500),
    image: z.union([z.literal(''), mediaUrl]).optional(),
  })
  .superRefine(({ component }, ctx) => {
    if (countComponents(component) > 40)
      ctx.addIssue({
        code: 'custom',
        path: ['component'],
        message: '包含容器與附屬元件，最多 40 個元件',
      });
  });
export type Design = z.infer<typeof designSchema>;
export type Issue = { path: string; message: string };

// Drafts may contain incomplete values, but must retain a safe, renderable shape.
// Publication always uses designSchema, never this schema.
const draftMedia = z.strictObject({ url: z.string() });
const draftText = z.strictObject({ ...textSchema.shape, content: z.string() });
const draftButton = z.strictObject({
  ...buttonSchema.shape,
  url: z.string(),
  label: z.string().optional(),
  emoji: z
    .strictObject({
      name: z.string().optional(),
      id: z.string().nullable().optional(),
      animated: z.boolean().optional(),
    })
    .optional(),
});
const draftThumbnail = z.strictObject({ ...thumbnailSchema.shape, media: draftMedia });
const draftChildren = z.union([
  draftText,
  separatorSchema,
  z.strictObject({ ...rowSchema.shape, components: z.array(draftButton) }),
  z.strictObject({
    ...sectionSchema.shape,
    components: z.array(draftText),
    accessory: z.union([draftButton, draftThumbnail]),
  }),
  z.strictObject({
    ...gallerySchema.shape,
    items: z.array(
      z.strictObject({ media: draftMedia, description, spoiler: z.boolean().optional() }),
    ),
  }),
]);
export const draftDesignSchema = z.strictObject({
  ...designSchema.shape,
  title: z.string(),
  description: z.string(),
  image: z.string().optional(),
  component: z.strictObject({ ...containerSchema.shape, components: z.array(draftChildren) }),
});

export function issuesFrom(error: z.ZodError): Issue[] {
  const walk = (issues: z.core.$ZodIssue[]): Issue[] =>
    issues.flatMap((issue) => {
      if (issue.code === 'invalid_union') {
        // Choose the closest component shape so errors point at the real field, not every union branch.
        const alternatives = issue.errors.filter(
          (group) => !group.some((i) => i.code === 'invalid_value' && i.path.at(-1) === 'type'),
        );
        if (alternatives.length) return walk(alternatives.sort((a, b) => a.length - b.length)[0]);
      }
      return [{ path: issue.path.join('.') || 'design', message: issue.message }];
    });
  return walk(error.issues);
}

export const initialDesign: Design = {
  schemaVersion: 1,
  title: '把好點子，分享出去。',
  description: '在 Discord 打造吸睛的互動卡片，完整呈現你的點子。',
  image: '',
  component: {
    type: 17,
    accent_color: 12513892,
    components: [
      { type: 10, content: '## 把好點子，分享出去。\n在 Discord 打造專屬的精美互動卡片。' },
      { type: 14, divider: true, spacing: 1 },
      {
        type: 10,
        content:
          '✦ **專為社群打造**\n展示作品、發布公告，或凝聚社群成員。\n\n從左側開始編輯，自訂卡片內容與樣式。',
      },
      {
        type: 1,
        components: [{ type: 2, style: 5, label: '探索更多', url: 'https://discord.com' }],
      },
    ],
  },
};

export const childNames: Record<Child['type'], string> = {
  10: '文字',
  9: '圖文區塊',
  12: '媒體相簿',
  14: '分隔線',
  1: '按鈕列',
};
export function createChild(type: Child['type']): Child {
  switch (type) {
    case 10:
      return { type: 10, content: '在這裡寫下你的內容…' };
    case 9:
      return {
        type: 9,
        components: [{ type: 10, content: '### 新的圖文區塊\n讓文字與圖片一起說故事。' }],
        accessory: { type: 11, media: { url: '' } },
      };
    case 12:
      return { type: 12, items: [{ media: { url: '' } }] };
    case 14:
      return { type: 14, divider: true, spacing: 1 };
    case 1:
      return {
        type: 1,
        components: [{ type: 2, style: 5, label: '開啟連結', url: 'https://example.com' }],
      };
  }
}
