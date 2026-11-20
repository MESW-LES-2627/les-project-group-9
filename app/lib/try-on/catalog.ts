import {matchesCategory, type ProductCategory} from '~/lib/taxonomy';
import {withCorsParam} from './url';

/**
 * Gating and overlay resolution for the front-camera try-on.
 *
 * A piece is try-on capable when the **selected variant** has a transparent PNG
 * overlay (`custom.try_on_overlay`) and its product category is Earrings or
 * Necklaces. There is no product-level fallback: colours are independent.
 */

export type TryOnKind = 'earring' | 'necklace';

export type TryOnPiece = {
  /** Variant GID; stable key when several pieces share one camera frame. */
  id: string;
  kind: TryOnKind;
  /** Absolute overlay URL, already cache-busted for CORS (see `url.ts`). */
  overlayUrl: string;
  /** Real width of the overlay in centimetres. */
  sizeCm: number;
};

/** Metafield reference shape returned by `custom.try_on_overlay`. */
export type TryOnReference = {
  url?: string | null;
  image?: {url?: string | null} | null;
};

/** Product fields needed to decide the kind. */
export type TryOnProduct = {
  category?: ProductCategory | null;
};

/** Variant fields that carry the overlay. */
export type TryOnVariant = {
  id: string;
  tryOnOverlay?: {reference?: TryOnReference | null} | null;
  tryOnSize?: {value?: string | null} | null;
};

export const DEFAULT_TRY_ON_SIZE_CM: Record<TryOnKind, number> = {
  earring: 2,
  necklace: 16,
};

const MIN_SIZE_CM = 0.2;
const MAX_SIZE_CM = 100;

/**
 * The try-on kind for a product, or `null` for unsupported categories.
 * Matches the taxonomy id, so a localized category name cannot hide the
 * button after the shopper changes language.
 */
export function tryOnKind(product: TryOnProduct): TryOnKind | null {
  if (matchesCategory(product.category, 'earrings')) return 'earring';
  if (matchesCategory(product.category, 'necklaces')) return 'necklace';

  return null;
}

/**
 * Real overlay width in centimetres. Falls back to the kind's default when the
 * metafield is missing or outside a plausible range.
 */
export function parseTryOnSizeCm(
  value: string | null | undefined,
  kind: TryOnKind,
): number {
  const text = (value ?? '').trim().replace(',', '.');
  if (!text) return DEFAULT_TRY_ON_SIZE_CM[kind];

  const parsed = Number(text);

  if (
    !Number.isFinite(parsed) ||
    parsed < MIN_SIZE_CM ||
    parsed > MAX_SIZE_CM
  ) {
    return DEFAULT_TRY_ON_SIZE_CM[kind];
  }

  return parsed;
}

/** Overlay URL from the variant's metafield. */
export function resolveOverlayUrl(variant: TryOnVariant): string | null {
  const reference = variant.tryOnOverlay?.reference;
  return reference?.image?.url?.trim() || reference?.url?.trim() || null;
}

/**
 * Everything the try-on UI needs for a variant, or `null` when the button must
 * not render (unsupported category, or this colour has no overlay).
 */
export function resolveTryOn(
  product: TryOnProduct,
  variant: TryOnVariant | null | undefined,
): TryOnPiece | null {
  if (!variant) return null;

  const kind = tryOnKind(product);
  if (!kind) return null;

  const overlayUrl = resolveOverlayUrl(variant);
  if (!overlayUrl) return null;

  return {
    id: variant.id,
    kind,
    overlayUrl: withCorsParam(overlayUrl),
    sizeCm: parseTryOnSizeCm(variant.tryOnSize?.value, kind),
  };
}
