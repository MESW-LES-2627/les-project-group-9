import {data} from 'react-router';
import type {Route} from './+types/api.profile.fitting-room';
import {updateCustomerFittingRoom} from '~/lib/profile/customer.server';
import {isVariantGid} from '~/lib/profile/list-schema';
import {NO_STORE, readListOperation} from '~/lib/profile/operation.server';
import {resolveTryOn} from '~/lib/try-on/catalog';
import {loadVariantsByIds} from '~/lib/variants.server';

export async function action({request, context}: Route.ActionArgs) {
  const result = await readListOperation(
    request,
    context,
    'No fitting room changes',
    isVariantGid,
  );

  if ('error' in result) {
    return data(
      {error: result.error},
      {status: result.status, headers: NO_STORE},
    );
  }

  if (result.operation.add?.length) {
    // The fitting room exists to try pieces on, so only variants with a
    // try-on overlay (and an Earrings/Necklaces product) may enter it.
    const variants = await loadVariantsByIds(context, result.operation.add);
    const tryOnIds = new Set(
      variants
        .filter((variant) => resolveTryOn(variant.product, variant) !== null)
        .map((variant) => variant.id),
    );
    const unsupported = result.operation.add.filter(
      (id) => !tryOnIds.has(id),
    );

    if (unsupported.length > 0) {
      return data(
        {
          error:
            'Only variants available for try-on can be added to the fitting room',
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
