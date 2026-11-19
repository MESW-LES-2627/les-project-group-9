import {data} from 'react-router';
import type {Route} from './+types/api.profile.preferences.export';
import {readCustomerProfile} from '~/lib/profile/customer.server';

const NO_STORE = {
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
} as const;

export async function loader({context}: Route.LoaderArgs) {
  const loggedIn = await context.customerAccount.isLoggedIn();
  if (!loggedIn) {
    return data(
      {error: 'Unauthorized'},
      {status: 401, headers: NO_STORE},
    );
  }

  try {
    const profile = await readCustomerProfile(context);
    const body = JSON.stringify(profile.preferences, null, 2);

    return new Response(body, {
      headers: {
        ...NO_STORE,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="jeweliette-preferences.json"',
      },
    });
  } catch (error) {
    console.error('Preferences export failed', error);

    return data(
      {error: 'Could not export preferences'},
      {status: 500, headers: NO_STORE},
    );
  }
}
