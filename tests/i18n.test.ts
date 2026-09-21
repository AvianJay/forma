import { describe, expect, it } from 'vitest';
import {
  createInitialDesign,
  getLocalizedSchemas,
  issuesFrom,
  localizedParseOptions,
} from '../src/shared/design';
import {
  messages,
  parseAcceptLanguage,
  parseLocaleCookie,
  parseLocaleParam,
  resolveLocale,
} from '../src/shared/i18n';

describe('locale resolution', () => {
  it('keeps both dictionaries complete and recognizes public locale values', () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages['zh-Hant']).sort());
    expect(parseLocaleParam('en')).toBe('en');
    expect(parseLocaleParam('zh-Hant')).toBe('zh-Hant');
    expect(parseLocaleParam('fr')).toBeNull();
  });

  it('uses query, cookie, and browser language in priority order', () => {
    expect(
      resolveLocale({
        query: 'en',
        cookie: 'forma_locale=zh-Hant',
        languages: ['zh-TW'],
      }),
    ).toBe('en');
    expect(
      resolveLocale({
        cookie: 'other=x; forma_locale=zh-Hant',
        languages: ['en-US'],
      }),
    ).toBe('zh-Hant');
    expect(resolveLocale({ languages: ['zh-HK'] })).toBe('zh-Hant');
    expect(resolveLocale({ languages: ['zh-Hans'] })).toBe('en');
    expect(resolveLocale({ languages: ['fr-FR'] })).toBe('en');
    expect(resolveLocale({})).toBe('zh-Hant');
    expect(parseLocaleCookie('forma_locale=en')).toBe('en');
    expect(parseAcceptLanguage('zh-TW;q=0.5, en-US;q=0.9')).toBe('en');
  });
});

describe('localized designs and validation', () => {
  it.each(['zh-Hant', 'en'] as const)('creates a valid %s starter design', (locale) => {
    const { designSchema } = getLocalizedSchemas(locale);
    expect(designSchema.safeParse(createInitialDesign(locale)).success).toBe(true);
  });

  it('returns request-local validation messages without global locale state', () => {
    const invalid = { ...createInitialDesign('en'), title: '' };
    const english = getLocalizedSchemas('en').designSchema.safeParse(
      invalid,
      localizedParseOptions('en'),
    );
    const chinese = getLocalizedSchemas('zh-Hant').designSchema.safeParse(
      invalid,
      localizedParseOptions('zh-Hant'),
    );
    expect(english.success).toBe(false);
    expect(chinese.success).toBe(false);
    if (english.success || chinese.success) throw new Error('Expected validation failures');
    expect(issuesFrom(english.error)).toContainEqual({
      path: 'title',
      message: 'Enter a preview title',
    });
    expect(issuesFrom(chinese.error)).toContainEqual({
      path: 'title',
      message: '請填寫預覽標題',
    });
  });
});
