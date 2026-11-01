import {data} from 'react-router';
import type {Route} from './+types/api.profile';
import {readCustomerFavorites} from '~/lib/profile/customer.server';

export async function loader({context}: Route.LoaderArgs) {
  const loggedIn = await context.customerAccount.isLoggedIn();
  const favorites = loggedIn
    ? await readCustomerFavorites(context).catch(() => [])
    : [];

  return data(
    {loggedIn, favorites},
    {
      headers: {
        'Cache-Control': 'no-store',
        Vary: 'Cookie',
      },
    },
  );
}
