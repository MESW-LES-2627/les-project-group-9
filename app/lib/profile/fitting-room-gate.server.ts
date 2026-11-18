import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import {loadVariantsByIds} from '~/lib/variants.server';
import {resolveTryOn} from '~/lib/try-on/catalog';
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

    return await updateCustomerFittingRoom(context, {remove: unsupported});
  } catch (error) {
    console.error('Could not prune the fitting room', error);
    return ids;
  }
}
