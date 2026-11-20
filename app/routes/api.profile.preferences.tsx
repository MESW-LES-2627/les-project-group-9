import {data} from 'react-router';
import type {Route} from './+types/api.profile.preferences';
import {
  deleteCustomerPreferences,
  writeCustomerPreferences,
} from '~/lib/profile/customer.server';
import {normalizePreferencesPatch} from '~/lib/profile/preferences';

const NO_STORE = {
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
} as const;

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST' && request.method !== 'DELETE') {
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

  if (request.method === 'DELETE') {
    try {
      const preferences = await deleteCustomerPreferences(context);
      return data({preferences}, {headers: NO_STORE});
    } catch (error) {
      return data(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Could not delete preferences',
        },
        {
          status: 400,
          headers: NO_STORE,
        },
      );
    }
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

  try {
    const preferences = await writeCustomerPreferences(
      context,
      normalizePreferencesPatch(payload),
    );
    return data({preferences}, {headers: NO_STORE});
  } catch (error) {
    return data(
      {
        error:
          error instanceof Error ? error.message : 'Could not save preferences',
      },
      {
        status: 400,
        headers: NO_STORE,
      },
    );
  }
}
