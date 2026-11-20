import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import {loadVariantsByIds} from '~/lib/variants.server';
import {resolveOverlayUrl, resolveTryOn} from '~/lib/try-on/catalog';
import {updateCustomerFittingRoom} from './customer.server';

type Context = Parameters<typeof updateCustomerFittingRoom>[0] &
  Pick<HydrogenRouterContextProvider, 'storefront'>;

/**
 * Removes fitting-room entries that can no longer be tried on: a variant with
 * its overlay removed, a category change or an unpublished product. Runs when
 * the profile is loaded, so the header count and the wardrobe agree. Legacy
 * product GIDs never parse into the variant list, so they disappear
 * immediately. A catalog failure keeps the list instead of breaking the
 * profile request.
 *
 * A variant that still has an overlay but no recognised category is treated as
 * a catalogue/locale problem rather than a stale item: pruning it would delete
 * the shopper's wardrobe during, for example, a category-name localization
 * regression. In that case the whole prune is skipped and logged.
 */
export async function pruneFittingRoom(
  context: Context,
  ids: string[],
): Promise<string[]> {
  if (!ids.length) return ids;

  try {
    const variants = await loadVariantsByIds(context, ids);
    const supported = new Set(
      variants
        .filter((variant) => resolveTryOn(variant.product, variant) !== null)
        .map((variant) => variant.id),
    );
    const unsupported = ids.filter((id) => !supported.has(id));

    if (!unsupported.length) return ids;

    const misclassified = variants.filter(
      (variant) =>
        !supported.has(variant.id) && resolveOverlayUrl(variant) !== null,
    );

    if (misclassified.length) {
      console.error(
        `Fitting room prune skipped: ${misclassified.length} variant(s) have an overlay but no supported category`,
      );
      return ids;
    }

    return await updateCustomerFittingRoom(context, {remove: unsupported});
  } catch (error) {
    console.error('Could not prune the fitting room', error);
    return ids;
  }
}
