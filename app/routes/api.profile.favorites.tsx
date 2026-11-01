import {data} from 'react-router';
import type {Route} from './+types/api.profile.favorites';
import {updateCustomerFavorites} from '~/lib/profile/customer.server';
import {isProductGid} from '~/lib/profile/schema';
import type {FavoriteOperation} from '~/lib/profile/types';

const NO_STORE = {
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
} as const;

function validIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(isProductGid).slice(0, 500)
    : [];
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {
      status: 405,
      headers: NO_STORE,
    });
  }

  const loggedIn = await context.customerAccount.isLoggedIn();
  if (!loggedIn) {
    return data({error: 'Unauthorized'}, {
      status: 401,
      headers: NO_STORE,
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return data({error: 'Invalid JSON'}, {
      status: 400,
      headers: NO_STORE,
    });
  }

  const source = (payload ?? {}) as Record<string, unknown>;
  const operation: FavoriteOperation = {};

  if (Array.isArray(source.add)) operation.add = validIds(source.add);
  if (Array.isArray(source.remove)) operation.remove = validIds(source.remove);

  if (operation.add === undefined && operation.remove === undefined) {
    return data({error: 'No favorite changes'}, {
      status: 400,
      headers: NO_STORE,
    });
  }

  try {
    const favorites = await updateCustomerFavorites(context, operation);
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
