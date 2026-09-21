import { z } from 'zod';
import { DEFAULT_LOCALE, t, type Locale } from './i18n';

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
    .min(1, t(DEFAULT_LOCALE, 'validation.urlRequired'))
    .max(max, t(DEFAULT_LOCALE, 'validation.urlTooLong', { max }))
    .refine(isHttpUrl, t(DEFAULT_LOCALE, 'validation.urlInvalid'));
const mediaUrl = httpUrl(2048).transform(normalizeMediaUrl).pipe(httpUrl(2048));
const id = z.number().int().min(0).max(2147483647).optional();
const description = z.string().max(1024).nullable().optional();
const media = z.strictObject({ url: mediaUrl });
export const textSchema = z.strictObject({
  type: z.literal(10),
  id,
  content: z
    .string()
    .min(1, t(DEFAULT_LOCALE, 'validation.textRequired'))
    .max(4000, t(DEFAULT_LOCALE, 'validation.textTooLong')),
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
      .refine((e) => !!e.name || !!e.id, t(DEFAULT_LOCALE, 'validation.emojiRequired'))
      .optional(),
    disabled: z.boolean().optional(),
  })
  .refine((b) => !!b.label || !!b.emoji, t(DEFAULT_LOCALE, 'validation.buttonRequired'));
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
  components: z
    .array(childSchema)
    .min(1, t(DEFAULT_LOCALE, 'validation.componentRequired'))
    .max(39),
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
        message: t(DEFAULT_LOCALE, 'validation.componentLimit'),
      });
  });
export const designSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    component: containerSchema,
    title: z.string().trim().min(1, t(DEFAULT_LOCALE, 'validation.titleRequired')).max(200),
    description: z.string().max(500),
    image: z.union([z.literal(''), mediaUrl]).optional(),
  })
  .superRefine(({ component }, ctx) => {
    if (countComponents(component) > 40)
      ctx.addIssue({
        code: 'custom',
        path: ['component'],
        message: t(DEFAULT_LOCALE, 'validation.componentLimit'),
      });
  });

function buildLocalizedSchemas(locale: Locale) {
  const tr = (key: Parameters<typeof t>[1], values?: Record<string, string | number>) =>
    t(locale, key, values);
  const localizedHttpUrl = (max: number) =>
    z
      .string()
      .trim()
      .min(1, tr('validation.urlRequired'))
      .max(max, tr('validation.urlTooLong', { max }))
      .refine(isHttpUrl, tr('validation.urlInvalid'));
  const localizedMediaUrl = localizedHttpUrl(2048)
    .transform(normalizeMediaUrl)
    .pipe(localizedHttpUrl(2048));
  const localizedId = z.number().int().min(0).max(2147483647).optional();
  const localizedDescription = z.string().max(1024).nullable().optional();
  const localizedMedia = z.strictObject({ url: localizedMediaUrl });
  const localizedText = z.strictObject({
    type: z.literal(10),
    id: localizedId,
    content: z
      .string()
      .min(1, tr('validation.textRequired'))
      .max(4000, tr('validation.textTooLong')),
  });
  const localizedButton = z
    .strictObject({
      type: z.literal(2),
      style: z.literal(5),
      url: localizedHttpUrl(512),
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
        .refine((emoji) => !!emoji.name || !!emoji.id, tr('validation.emojiRequired'))
        .optional(),
      disabled: z.boolean().optional(),
    })
    .refine((button) => !!button.label || !!button.emoji, tr('validation.buttonRequired'));
  const localizedThumbnail = z.strictObject({
    type: z.literal(11),
    id: localizedId,
    media: localizedMedia,
    description: localizedDescription,
    spoiler: z.boolean().optional(),
  });
  const localizedSection = z.strictObject({
    type: z.literal(9),
    id: localizedId,
    components: z.array(localizedText).min(1).max(3),
    accessory: z.union([localizedButton, localizedThumbnail]),
  });
  const localizedRow = z.strictObject({
    type: z.literal(1),
    id: localizedId,
    components: z.array(localizedButton).min(1).max(5),
  });
  const localizedGallery = z.strictObject({
    type: z.literal(12),
    id: localizedId,
    items: z
      .array(
        z.strictObject({
          media: localizedMedia,
          description: localizedDescription,
          spoiler: z.boolean().optional(),
        }),
      )
      .min(1)
      .max(10),
  });
  const localizedSeparator = z.strictObject({
    type: z.literal(14),
    id: localizedId,
    divider: z.boolean().optional(),
    spacing: z.union([z.literal(1), z.literal(2)]).optional(),
  });
  const localizedChild = z.union([
    localizedText,
    localizedSection,
    localizedRow,
    localizedGallery,
    localizedSeparator,
  ]);
  const localizedContainer = z.strictObject({
    type: z.literal(17),
    id: localizedId,
    accent_color: z.number().int().min(0).max(0xffffff).nullable().optional(),
    spoiler: z.boolean().optional(),
    components: z.array(localizedChild).min(1, tr('validation.componentRequired')).max(39),
  });
  const localizedPayload = z
    .strictObject({ component: localizedContainer })
    .superRefine(({ component }, ctx) => {
      if (countComponents(component) > 40)
        ctx.addIssue({
          code: 'custom',
          path: ['component'],
          message: tr('validation.componentLimit'),
        });
    });
  const localizedDesign = z
    .strictObject({
      schemaVersion: z.literal(1),
      component: localizedContainer,
      title: z.string().trim().min(1, tr('validation.titleRequired')).max(200),
      description: z.string().max(500),
      image: z.union([z.literal(''), localizedMediaUrl]).optional(),
    })
    .superRefine(({ component }, ctx) => {
      if (countComponents(component) > 40)
        ctx.addIssue({
          code: 'custom',
          path: ['component'],
          message: tr('validation.componentLimit'),
        });
    });
  return { payloadSchema: localizedPayload, designSchema: localizedDesign };
}

const localizedSchemaCache = new Map<Locale, ReturnType<typeof buildLocalizedSchemas>>();
export function getLocalizedSchemas(locale: Locale = DEFAULT_LOCALE) {
  let schemas = localizedSchemaCache.get(locale);
  if (!schemas) {
    schemas = buildLocalizedSchemas(locale);
    localizedSchemaCache.set(locale, schemas);
  }
  return schemas;
}

export function localizedParseOptions(locale: Locale) {
  return { error: () => t(locale, 'validation.invalid') };
}
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

export function createInitialDesign(locale: Locale = DEFAULT_LOCALE): Design {
  return {
    schemaVersion: 1,
    title: t(locale, 'starter.title'),
    description: t(locale, 'starter.description'),
    image: '',
    component: {
      type: 17,
      accent_color: 12513892,
      components: [
        { type: 10, content: t(locale, 'starter.hero') },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: t(locale, 'starter.body') },
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: t(locale, 'starter.explore'),
              url: 'https://discord.com',
            },
          ],
        },
      ],
    },
  };
}

export const initialDesign: Design = createInitialDesign();

export const childNames: Record<Child['type'], string> = {
  10: t(DEFAULT_LOCALE, 'component.text'),
  9: t(DEFAULT_LOCALE, 'component.section'),
  12: t(DEFAULT_LOCALE, 'component.gallery'),
  14: t(DEFAULT_LOCALE, 'component.separator'),
  1: t(DEFAULT_LOCALE, 'component.row'),
};

export function childName(type: Child['type'], locale: Locale = DEFAULT_LOCALE): string {
  const keys = {
    10: 'component.text',
    9: 'component.section',
    12: 'component.gallery',
    14: 'component.separator',
    1: 'component.row',
  } as const;
  return t(locale, keys[type]);
}

export function createChild(type: Child['type'], locale: Locale = DEFAULT_LOCALE): Child {
  switch (type) {
    case 10:
      return { type: 10, content: t(locale, 'starter.text') };
    case 9:
      return {
        type: 9,
        components: [{ type: 10, content: t(locale, 'starter.section') }],
        accessory: { type: 11, media: { url: '' } },
      };
    case 12:
      return { type: 12, items: [{ media: { url: '' } }] };
    case 14:
      return { type: 14, divider: true, spacing: 1 };
    case 1:
      return {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: t(locale, 'field.openLink'),
            url: 'https://example.com',
          },
        ],
      };
  }
}
