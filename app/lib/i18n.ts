import type {I18nBase} from '@shopify/hydrogen';
import {useRouteLoaderData} from 'react-router';
import type {RootLoader} from '~/root';

/**
 * Storefront languages. `language` is the Storefront/Customer Account API
 * `LanguageCode` used with `@inContext`; `tag` is the BCP 47 tag used for
 * `<html lang>` and `Intl`.
 */
export const LOCALES = {
  en: {language: 'EN', tag: 'en-US', name: 'English (US)', short: 'EN'},
  pt: {
    language: 'PT_PT',
    tag: 'pt-PT',
    name: 'Português (Portugal)',
    short: 'PT',
  },
} as const satisfies Record<
  string,
  {language: I18nBase['language']; tag: string; name: string; short: string}
>;

export type LocaleCode = keyof typeof LOCALES;

export const LOCALE_CODES = Object.keys(LOCALES) as LocaleCode[];
export const DEFAULT_LOCALE: LocaleCode = 'en';

/**
 * The commercial country sent with every Storefront query. It does not change
 * with the language, so switching language never changes market or currency.
 */
export const DEFAULT_COUNTRY: I18nBase['country'] = 'US';

export const LOCALE_COOKIE = 'jeweliette_locale';
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The active locale as exposed by the root loader. */
export type AppLocale = {
  code: LocaleCode;
  language: I18nBase['language'];
  country: I18nBase['country'];
  tag: string;
};

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === 'string' && Object.hasOwn(LOCALES, value);
}

/** Reads the language cookie; anything missing or unsupported is the default. */
export function readLocaleCookie(cookieHeader: string | null): LocaleCode {
  if (!cookieHeader) return DEFAULT_LOCALE;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== LOCALE_COOKIE) continue;

    const value = part.slice(separator + 1).trim();
    return isLocaleCode(value) ? value : DEFAULT_LOCALE;
  }

  return DEFAULT_LOCALE;
}

/** Builds the `Set-Cookie` value that persists the chosen language for a year. */
export function serializeLocaleCookie(
  code: LocaleCode,
  {secure}: {secure: boolean},
): string {
  return [
    `${LOCALE_COOKIE}=${code}`,
    'Path=/',
    `Max-Age=${LOCALE_COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

/** Hydrogen `i18n` for a request, from the language cookie. */
export function getLocaleFromRequest(request: Request): I18nBase {
  const code = readLocaleCookie(request.headers.get('Cookie'));
  return {language: LOCALES[code].language, country: DEFAULT_COUNTRY};
}

/** Maps Hydrogen's `i18n` back to the app locale (unknown languages → default). */
export function toAppLocale(i18n: I18nBase): AppLocale {
  const code =
    LOCALE_CODES.find((key) => LOCALES[key].language === i18n.language) ??
    DEFAULT_LOCALE;

  return {
    code,
    language: LOCALES[code].language,
    country: i18n.country,
    tag: LOCALES[code].tag,
  };
}

/*
 * UI messages. US-046 only covers the language selector and shared
 * navigation; US-047 extends this dictionary to the rest of the interface.
 * `en` defines the key set; every other language must provide every key.
 */
const en = {
  'language.label': 'Language',
  'language.current': 'Current language: {language}',
  'nav.skipToContent': 'Skip to content',
  'nav.main': 'Main navigation',
  'nav.mobile': 'Mobile menu',
  'nav.accountActions': 'Account actions',
  'nav.home': 'Home',
  'nav.homeOf': '{shop} — home',
  'nav.openMenu': 'Open menu',
  'nav.menu': 'Menu',
  'nav.search': 'Search',
  'nav.account': 'Account',
  'nav.myAccount': 'My account',
  'nav.favorites': 'Favorites',
  'nav.fittingRoom': 'Fitting room',
  'nav.shoppingBag': 'Shopping bag',
  'nav.openCart': 'Open cart with {count} items',
  'nav.close': 'Close',
  'nav.closePanel': 'Close panel',
} as const;

export type MessageKey = keyof typeof en;
type Messages = Record<MessageKey, string>;

const MESSAGES: Record<LocaleCode, Messages> = {
  en,
  pt: {
    'language.label': 'Idioma',
    'language.current': 'Idioma atual: {language}',
    'nav.skipToContent': 'Saltar para o conteúdo',
    'nav.main': 'Navegação principal',
    'nav.mobile': 'Menu móvel',
    'nav.accountActions': 'Ações da conta',
    'nav.home': 'Início',
    'nav.homeOf': '{shop} — início',
    'nav.openMenu': 'Abrir menu',
    'nav.menu': 'Menu',
    'nav.search': 'Pesquisar',
    'nav.account': 'Conta',
    'nav.myAccount': 'A minha conta',
    'nav.favorites': 'Favoritos',
    'nav.fittingRoom': 'Provador',
    'nav.shoppingBag': 'Saco de compras',
    'nav.openCart': 'Abrir saco com {count} artigos',
    'nav.close': 'Fechar',
    'nav.closePanel': 'Fechar painel',
  },
};

export type Translate = (
  key: MessageKey,
  values?: Record<string, string | number>,
) => string;

/** Returns a translate function for a locale, falling back to English per key. */
export function createTranslator(code: LocaleCode): Translate {
  const messages = MESSAGES[code];

  return (key, values) => {
    const template = messages[key] ?? MESSAGES[DEFAULT_LOCALE][key];
    if (!values) return template;

    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match,
    );
  };
}

/** The active locale from the root loader; the default outside of it (e.g. error pages). */
export function useLocale(): AppLocale {
  const data = useRouteLoaderData<RootLoader>('root');
  return (
    data?.locale ??
    toAppLocale({
      language: LOCALES[DEFAULT_LOCALE].language,
      country: DEFAULT_COUNTRY,
    })
  );
}

/** Translate function for the active locale. */
export function useTranslation(): Translate {
  return createTranslator(useLocale().code);
}
