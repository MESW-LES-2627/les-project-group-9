import {data} from 'react-router';
import type {Route} from './+types/api.profile.favorites';
import {updateCustomerFavorites} from '~/lib/profile/customer.server';
import {isProductGid} from '~/lib/profile/list-schema';
import {NO_STORE, readListOperation} from '~/lib/profile/operation.server';

export async function action({request, context}: Route.ActionArgs) {
  const result = await readListOperation(
    request,
    context,
    'No favorite changes',
    isProductGid,
  );

  if ('error' in result) {
    return data(
      {error: result.error},
      {status: result.status, headers: NO_STORE},
    );
  }

  try {
    const favorites = await updateCustomerFavorites(context, result.operation);
    return data({favorites}, {headers: NO_STORE});
  } catch (error) {
    return data(
      {
        error:
          error instanceof Error ? error.message : 'Could not save favorites',
      },
      {
        status: 400,
        headers: NO_STORE,
      },
    );
  }
}
