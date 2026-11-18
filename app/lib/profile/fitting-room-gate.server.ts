import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import {loadProductsByIds} from '~/lib/products.server';
import {resolveTryOn} from '~/lib/try-on/catalog';
import {updateCustomerFittingRoom} from './customer.server';

type Context = Parameters<typeof updateCustomerFittingRoom>[0] &
  Pick<HydrogenRouterContextProvider, 'storefront'>;

/**
 * Removes fitting-room entries that can no longer be tried on: a category
 * change, a missing overlay or an unpublished product. Runs when the profile is
 * loaded, so the header count and the wardrobe agree. A catalog failure keeps
 * the list instead of breaking the profile request.
 */
export async function pruneFittingRoom(
  context: Context,
  ids: string[],
): Promise<string[]> {
  if (!ids.length) return ids;

  try {
    const products = await loadProductsByIds(context, ids);
    const supported = new Set(
      products
        .filter((product) => resolveTryOn(product) !== null)
        .map((product) => product.id),
    );
    const unsupported = ids.filter((id) => !supported.has(id));

    if (!unsupported.length) return ids;

    return await updateCustomerFittingRoom(context, {remove: unsupported});
  } catch (error) {
    console.error('Could not prune the fitting room', error);
    return ids;
  }
}
