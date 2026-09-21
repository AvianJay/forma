import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_LOCALE, t, type Locale, type MessageKey } from './i18n';

type I18nValue = {
  locale: Locale;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  t: (key, values) => t(DEFAULT_LOCALE, key, values),
});

export function I18nProvider({ locale, children }: { locale: Locale; children?: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, t: (key, values) => t(locale, key, values) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
