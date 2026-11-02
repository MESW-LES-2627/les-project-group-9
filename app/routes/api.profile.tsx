import {data} from 'react-router';
import type {Route} from './+types/api.profile';
import {readCustomerProfile} from '~/lib/profile/customer.server';

export async function loader({context}: Route.LoaderArgs) {
  const loggedIn = await context.customerAccount.isLoggedIn();
  const profile = loggedIn
    ? await readCustomerProfile(context).catch(() => null)
    : null;

  return data(
    {
      loggedIn,
      favorites: profile?.favorites ?? [],
      preferences: profile?.preferences ?? null,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        Vary: 'Cookie',
      },
    },
  );
}
