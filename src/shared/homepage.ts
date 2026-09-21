import type { Design } from './design';
import { DEFAULT_LOCALE, t, type Locale } from './i18n';

export function homepageDesign(origin: string, locale: Locale = DEFAULT_LOCALE): Design {
  return {
    schemaVersion: 1,
    title: t(locale, 'homepage.title'),
    description: t(locale, 'homepage.description'),
    component: {
      type: 17,
      accent_color: 0xbef264,
      components: [
        {
          type: 10,
          content: t(locale, 'homepage.hero'),
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 10,
          content: t(locale, 'homepage.features'),
        },
        {
          type: 1,
          components: [
            { type: 2, style: 5, label: t(locale, 'homepage.start'), url: `${origin}/` },
            { type: 2, style: 5, label: 'GitHub', url: 'https://github.com/AvianJay/forma' },
          ],
        },
      ],
    },
  };
}
