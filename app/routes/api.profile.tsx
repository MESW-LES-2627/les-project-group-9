import {data} from 'react-router';
import type {Route} from './+types/api.profile';
import {readCustomerProfile} from '~/lib/profile/customer.server';
import {pruneFittingRoom} from '~/lib/profile/fitting-room-gate.server';

const NO_STORE = {
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
} as const;

export async function loader({context}: Route.LoaderArgs) {
  const loggedIn = await context.customerAccount.isLoggedIn();

  if (!loggedIn) {
    return data(
      {loggedIn: false, favorites: [], fittingRoom: [], preferences: null},
      {headers: NO_STORE},
    );
  }

  try {
    const profile = await readCustomerProfile(context);
    const fittingRoom = await pruneFittingRoom(context, profile.fittingRoom);

    return data(
      {
        loggedIn: true,
        favorites: profile.favorites,
        fittingRoom,
        preferences: profile.preferences,
      },
      {headers: NO_STORE},
    );
  } catch (error) {
    console.error('Profile query failed', error);

    return data(
      {error: 'Could not load profile'},
      {status: 500, headers: NO_STORE},
    );
  }
}
