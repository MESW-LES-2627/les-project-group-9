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

  // Shared
  'common.allPieces': 'All pieces',
  'common.collections': 'Collections',
  'common.loading': 'Loading…',
  'common.loadPrevious': 'Load previous',
  'common.loadMore': 'Load more',
  'common.closeDialog': 'Close dialog',

  // Layout: announcement bar and fallback header menu
  'layout.announcement': 'Free shipping on orders over €100',
  'layout.tagline': 'Made to last',
  'menu.trending': 'Trending',
  'menu.watches': 'Watches',
  'menu.charms': 'Charms',
  'menu.jewelry': 'Jewelry',

  // Footer
  'footer.tagline': 'Modern jewelry to layer, gift and keep.',
  'footer.discover': 'Discover',
  'footer.information': 'Information',
  'footer.newsletterTitle': 'Stories in your inbox',
  'footer.newsletterText': 'News, style guides and early access.',
  'footer.email': 'Email address',
  'footer.newsletterSoon': 'Newsletter coming soon',
  'footer.subscribe': 'Subscribe to newsletter',
  'footer.signature': 'Designed to be kept',
  'policy.privacy': 'Privacy policy',
  'policy.refund': 'Refund policy',
  'policy.shipping': 'Shipping policy',
  'policy.terms': 'Terms of service',

  // Search
  'search.title': 'Search Jeweliette',
  'search.placeholder': 'What are you looking for?',
  'search.inputLabel': 'Search products',
  'search.seeAll': 'See all results',
  'search.searching': 'Searching…',
  'search.explore': 'Explore',
  'search.noResults': 'No results',
  'search.tryAnotherTerm': 'Try another term for “{term}”.',
  'search.noResultsFor': 'No results found for “{term}”',
  'search.unavailable': 'Search is temporarily unavailable. Please try again.',
  'search.prompt': 'Search for a piece, material or collection.',
  'search.noFilteredProducts':
    'No products match your search and selected filters.',
  'search.articles': 'Articles',
  'search.pages': 'Pages',
  'search.pieces': 'Pieces',
  'search.tryAnotherProduct': 'Try another product name, material or color.',

  // Cart (shared layout)
  'cart.loading': 'Loading cart',

  // Shared (dialogs)
  'common.cancel': 'Cancel',
} as const satisfies Record<string, string | PluralMessage>;

export type MessageKey = keyof typeof en;

/** The shape every language must provide. */
export type Messages = {
  [Key in MessageKey]: (typeof en)[Key] extends string ? string : PluralMessage;
};
