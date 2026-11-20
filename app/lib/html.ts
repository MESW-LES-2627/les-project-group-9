const MEDIA_ELEMENT = /<(img|picture|video|iframe|svg)\b/i;

/**
 * True when an HTML fragment has something to show.
 *
 * Shopify descriptions often contain empty paragraphs, `<br>` or `&nbsp;`
 * placeholders. Showing an accordion for those would suggest the product has
 * information it does not, so the product page hides it. Media-only
 * descriptions still count as content.
 */
export function hasHtmlContent(html?: string | null): boolean {
  if (!html?.trim()) return false;

  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .trim();

  if (text.length > 0) return true;

  return MEDIA_ELEMENT.test(html);
}
