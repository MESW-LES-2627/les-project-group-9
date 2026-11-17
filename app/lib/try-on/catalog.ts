import {withCorsParam} from './url';

/**
 * Gating and overlay resolution for the front-camera try-on.
 *
 * A piece is try-on capable when its Shopify category is Earrings or Necklaces
 * and it has a transparent PNG overlay. Merchants point `custom.try_on_overlay`
 * at that PNG; the featured image is only accepted when it is a `.png`.
 */

export type TryOnKind = 'earring' | 'necklace';

export type TryOnPiece = {
  kind: TryOnKind;
  /** Absolute overlay URL, already cache-busted for CORS (see `url.ts`). */
  overlayUrl: string;
  /** Real width of the overlay in centimeters. */
  sizeCm: number;
};

/** Metafield reference shape returned by `custom.try_on_overlay`. */
export type TryOnReference = {
  url?: string | null;
  image?: {url?: string | null} | null;
};

export type TryOnProduct = {
  category?: {name?: string | null} | null;
  featuredImage?: {url?: string | null} | null;
  tryOnOverlay?: {reference?: TryOnReference | null} | null;
  tryOnSize?: {value?: string | null} | null;
};

const KIND_BY_CATEGORY: Record<string, TryOnKind> = {
  earring: 'earring',
  earrings: 'earring',
  necklace: 'necklace',
  necklaces: 'necklace',
};

export const DEFAULT_TRY_ON_SIZE_CM: Record<TryOnKind, number> = {
  earring: 2,
  necklace: 16,
};

const MIN_SIZE_CM = 0.2;
const MAX_SIZE_CM = 100;

/** The try-on kind for a product, or `null` for unsupported categories. */
export function tryOnKind(product: TryOnProduct): TryOnKind | null {
  const name = product.category?.name?.trim().toLowerCase();
  if (!name) return null;

  return KIND_BY_CATEGORY[name] ?? null;
}

/** True when the URL path ends in `.png`, ignoring query strings. */
export function isPngUrl(url: string): boolean {
  try {
    return new URL(url, 'https://cdn.invalid').pathname
      .toLowerCase()
      .endsWith('.png');
  } catch {
    return false;
  }
}

/**
 * Real overlay width in centimeters. Falls back to the kind's default when the
 * metafield is missing or outside a plausible range.
 */
export function parseTryOnSizeCm(
  value: string | null | undefined,
  kind: TryOnKind,
): number {
  const text = (value ?? '').trim().replace(',', '.');
  if (!text) return DEFAULT_TRY_ON_SIZE_CM[kind];

  const parsed = Number(text);

  if (!Number.isFinite(parsed) || parsed < MIN_SIZE_CM || parsed > MAX_SIZE_CM) {
    return DEFAULT_TRY_ON_SIZE_CM[kind];
  }

  return parsed;
}

/** Overlay URL from the metafield, falling back to a transparent-PNG main image. */
export function resolveOverlayUrl(product: TryOnProduct): string | null {
  const reference = product.tryOnOverlay?.reference;
  const referenceUrl = reference?.image?.url?.trim() || reference?.url?.trim();
  if (referenceUrl) return referenceUrl;

  const featured = product.featuredImage?.url?.trim();
  if (featured && isPngUrl(featured)) return featured;

  return null;
}

/** Everything the try-on UI needs, or `null` when the button must not render. */
export function resolveTryOn(product: TryOnProduct): TryOnPiece | null {
  const kind = tryOnKind(product);
  if (!kind) return null;

  const overlayUrl = resolveOverlayUrl(product);
  if (!overlayUrl) return null;

  return {
    kind,
    overlayUrl: withCorsParam(overlayUrl),
    sizeCm: parseTryOnSizeCm(product.tryOnSize?.value, kind),
  };
}
