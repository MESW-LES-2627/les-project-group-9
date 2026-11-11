import type {I18nBase} from '@shopify/hydrogen';
import {useRouteLoaderData} from 'react-router';
import type {RootLoader} from '~/root';

/**
 * Storefront languages: the single place to enable a language.
 *
 * - key: app locale code (cookie and form value). Not a Shopify value.
 * - `language`: Storefront/Customer Account API `LanguageCode` for `@inContext`.
 *   `PT_PT` is "Portuguese (Portugal)" in the installed schema; the store must
 *   publish that language for it to return Portuguese content.
 * - `tag`: BCP 47 tag for `<html lang>`, `Intl` and Accept-Language matching.
 *
 * Only add a language here when it has full UI messages, is published in
 * Shopify for the active market, and its mapping has been verified
 * (see docs/i18n.md → Adding a language).
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
 * The country sent with every Storefront query (`@inContext(country:)`).
 * Unchanged from the template default and independent of the language:
 * switching language never changes it, and it is never inferred from
 * Accept-Language. Whether it should match the store's market is a separate,
 * open configuration decision (docs/i18n.md → Language and country).
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

/**
 * Reads the explicit language choice from the cookie header. Returns `null`
 * when there is no cookie or its value is unsupported, so browser
 * negotiation can still apply.
 */
export function readLocaleCookie(
  cookieHeader: string | null,
): LocaleCode | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== LOCALE_COOKIE) continue;

    const value = part.slice(separator + 1).trim();
    return isLocaleCode(value) ? value : null;
  }

  return null;
}

export type LanguagePreference = {tag: string; q: number};

const MAX_ACCEPT_LANGUAGE_LENGTH = 1024;
const MAX_ACCEPT_LANGUAGE_ENTRIES = 32;
const LANGUAGE_RANGE = /^(?:\*|[a-z]{1,8}(?:-[a-z0-9]{1,8})*)$/i;
const QUALITY = /^q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i;

/**
 * Parses an Accept-Language header (RFC 9110) into lowercase language ranges
 * ordered by quality, keeping header order for equal qualities. Entries with
 * `q=0`, malformed ranges or malformed quality values are dropped. Oversized
 * headers are truncated.
 */
export function parseAcceptLanguage(
  header: string | null,
): LanguagePreference[] {
  if (!header) return [];

  const preferences: Array<LanguagePreference & {order: number}> = [];
  const entries = header
    .slice(0, MAX_ACCEPT_LANGUAGE_LENGTH)
    .split(',')
    .slice(0, MAX_ACCEPT_LANGUAGE_ENTRIES);

  entries.forEach((entry, order) => {
    const [range = '', ...params] = entry.split(';').map((part) => part.trim());
    if (!LANGUAGE_RANGE.test(range)) return;

    let q = 1;
    for (const param of params) {
      if (!/^q=/i.test(param)) continue;
      const match = QUALITY.exec(param);
      if (!match) return;
      q = Number(match[1]);
    }

    if (q > 0) preferences.push({tag: range.toLowerCase(), q, order});
  });

  return preferences
    .sort((a, b) => b.q - a.q || a.order - b.order)
    .map(({tag, q}) => ({tag, q}));
}

function primarySubtag(tag: string): string {
  return tag.toLowerCase().split('-')[0];
}

/**
 * Picks the supported locale for the browser's preferences, or `null` if none
 * matches. For each preference, in quality order: an exact tag match wins,
 * otherwise the first locale with the same primary language (so `pt`, `pt-PT`
 * and `pt-BR` all map to European Portuguese, and any `en-*` to English).
 * The wildcard `*` names no specific language and is skipped.
 */
export function negotiateLocale(
  acceptLanguage: string | null,
): LocaleCode | null {
  for (const {tag} of parseAcceptLanguage(acceptLanguage)) {
    if (tag === '*') continue;

    const exact = LOCALE_CODES.find(
      (code) => LOCALES[code].tag.toLowerCase() === tag,
    );
    if (exact) return exact;

    const sameLanguage = LOCALE_CODES.find(
      (code) => primarySubtag(LOCALES[code].tag) === primarySubtag(tag),
    );
    if (sameLanguage) return sameLanguage;
  }

  return null;
}

export type LocaleSource = 'cookie' | 'browser' | 'default';

/**
 * Resolves the language for a request: an explicit choice in the cookie
 * first, then the browser's Accept-Language, then English. Negotiation never
 * sets a cookie, so it keeps following the browser until the shopper chooses.
 */
export function resolveLocale(request: Request): {
  code: LocaleCode;
  source: LocaleSource;
} {
  const chosen = readLocaleCookie(request.headers.get('Cookie'));
  if (chosen) return {code: chosen, source: 'cookie'};

  const negotiated = negotiateLocale(request.headers.get('Accept-Language'));
  if (negotiated) return {code: negotiated, source: 'browser'};

  return {code: DEFAULT_LOCALE, source: 'default'};
}

/**
 * Request headers that can change the resolved language. Responses list them
 * in `Vary` so a shared cache never serves one shopper's language to another.
 */
export const LOCALE_VARY_HEADERS = ['Cookie', 'Accept-Language'] as const;

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

/** Hydrogen `i18n` for a request (see `resolveLocale`). */
export function getLocaleFromRequest(request: Request): I18nBase {
  const {code} = resolveLocale(request);
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
 * `en` defines the key set and each message's shape; every other language
 * must provide every key with the same shape.
 *
 * A message is a string or, when it depends on a `count` value, an object of
 * Intl.PluralRules categories (`other` required). Plural forms are chosen in
 * `createTranslator` only; components just pass `{count}`.
 */
type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};

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
  'nav.openCart': {
    one: 'Open cart with {count} item',
    other: 'Open cart with {count} items',
  },
  'nav.close': 'Close',
  'nav.closePanel': 'Close panel',
} as const satisfies Record<string, string | PluralMessage>;

export type MessageKey = keyof typeof en;
type Messages = {
  [Key in MessageKey]: (typeof en)[Key] extends string ? string : PluralMessage;
};

const MESSAGES: Record<LocaleCode, Messages> = {
  en,
  pt: {
    'language.label': 'Idioma',
    'language.current': 'Idioma atual: {language}',
    'nav.skipToContent': 'Saltar para o conteúdo',
    'nav.main': 'Navegação principal',
    'nav.mobile': 'Menu de navegação',
    'nav.accountActions': 'Ações da conta',
    'nav.home': 'Início',
    'nav.homeOf': '{shop} — página inicial',
    'nav.openMenu': 'Abrir menu',
    'nav.menu': 'Menu',
    'nav.search': 'Pesquisar',
    'nav.account': 'Conta',
    'nav.myAccount': 'A minha conta',
    'nav.favorites': 'Favoritos',
    'nav.fittingRoom': 'Provador',
    'nav.shoppingBag': 'Saco de compras',
    'nav.openCart': {
      one: 'Abrir saco de compras com {count} artigo',
      other: 'Abrir saco de compras com {count} artigos',
    },
    'nav.close': 'Fechar',
    'nav.closePanel': 'Fechar painel',
  },
};

export type Translate = (
  key: MessageKey,
  values?: Record<string, string | number>,
) => string;

/**
 * Returns a translate function for a locale, falling back to English per key.
 * Plural messages pick their form with Intl.PluralRules for the locale and the
 * numeric `count` value, using `other` when the form or count is missing.
 */
export function createTranslator(code: LocaleCode): Translate {
  const messages: Messages = MESSAGES[code];
  const pluralRules = new Intl.PluralRules(LOCALES[code].tag);

  return (key, values) => {
    const message: string | PluralMessage =
      messages[key] ?? MESSAGES[DEFAULT_LOCALE][key];
    const template =
      typeof message === 'string'
        ? message
        : selectPluralForm(message, pluralRules, values?.count);
    if (!values) return template;

    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match,
    );
  };
}

function selectPluralForm(
  message: PluralMessage,
  rules: Intl.PluralRules,
  count: string | number | undefined,
): string {
  if (typeof count !== 'number') return message.other;
  return message[rules.select(count)] ?? message.other;
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
