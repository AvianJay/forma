import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from '../shared/I18nContext';
import { localeCookie, resolveLocale, t, type Locale } from '../shared/i18n';
import '../shared/preview.css';
import './style.css';

const initialLocale = resolveLocale({
  query: new URLSearchParams(location.search).get('lang'),
  cookie: document.cookie,
  languages: navigator.languages,
});

function Root() {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t(locale, 'meta.title');
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t(locale, 'meta.description'));
  }, [locale]);

  function changeLocale(next: Locale) {
    document.cookie = localeCookie(next);
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    history.replaceState(null, '', url);
    setLocale(next);
  }

  return (
    <I18nProvider locale={locale}>
      <App locale={locale} onLocaleChange={changeLocale} />
    </I18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
