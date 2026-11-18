import {data} from 'react-router';
import type {Route} from './+types/api.profile.fitting-room';
import {updateCustomerFittingRoom} from '~/lib/profile/customer.server';
import {NO_STORE, readListOperation} from '~/lib/profile/operation.server';
import {loadProductsByIds} from '~/lib/products.server';
import {resolveTryOn} from '~/lib/try-on/catalog';

export async function action({request, context}: Route.ActionArgs) {
  const result = await readListOperation(
    request,
    context,
    'No fitting room changes',
  );

  if ('error' in result) {
    return data(
      {error: result.error},
      {status: result.status, headers: NO_STORE},
    );
  }

  if (result.operation.add?.length) {
    // The fitting room exists to try pieces on, so only try-on capable
    // products (earrings/necklaces with a transparent overlay) may enter it.
    const products = await loadProductsByIds(context, result.operation.add);
    const tryOnIds = new Set(
      products
        .filter((product) => resolveTryOn(product) !== null)
        .map((product) => product.id),
    );
    const unsupported = result.operation.add.filter(
      (id) => !tryOnIds.has(id),
    );

    if (unsupported.length > 0) {
      return data(
        {
          error:
            'Only pieces available for try-on can be added to the fitting room',
        },
        {status: 400, headers: NO_STORE},
      );
    }
  }

  try {
    const fittingRoom = await updateCustomerFittingRoom(
      context,
      result.operation,
    );
    return data({fittingRoom}, {headers: NO_STORE});
  } catch (error) {
    return data(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not save fitting room',
      },
      {
        status: 400,
        headers: NO_STORE,
      },
    );
  }
}
