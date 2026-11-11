/**
 * English UI messages: the reference catalogue. Its keys define `MessageKey`
 * and each message's shape; `pt.ts` and `fr.ts` must provide every key with
 * the same shape, so a missing key fails the typecheck.
 *
 * Keys are grouped by module with a prefix (`nav.`, `cart.`, `product.`…).
 * A message is a string or, when it depends on a `count` value, an object of
 * Intl.PluralRules categories (`other` required). Placeholders use `{name}`.
 * See docs/i18n.md → UI messages.
 */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};

export const en = {
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

/** The shape every language must provide. */
export type Messages = {
  [Key in MessageKey]: (typeof en)[Key] extends string ? string : PluralMessage;
};
