import {LOCALE_CODES} from '~/lib/i18n';

/**
 * A leading language folder such as `/pt`, `/fr` or `/pt-pt`. Shopify adds it
 * to menu URLs when the menu is queried in that language, but this app picks
 * the language from a cookie and has no language folders in its routes.
 */
const LOCALE_PREFIX = new RegExp(
  `^/(?:${LOCALE_CODES.join('|')})(?:-[a-z]{2})?(?=/|$)`,
  'i',
);

/**
 * Turns a Shopify menu item URL into an in-app path: URLs on the shop's own
 * domains become their path without the language folder; any other URL
 * (external links, app paths) is returned unchanged.
 */
export function toMenuPath(url: string, shopDomains: string[]): string {
  const isShopUrl =
    url.includes('myshopify.com') ||
    shopDomains.some((domain) => domain !== '' && url.includes(domain));
  if (!isShopUrl) return url;

  return new URL(url).pathname.replace(LOCALE_PREFIX, '') || '/';
}
