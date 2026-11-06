import {data} from 'react-router';
import type {Route} from './+types/api.profile.fitting-room';
import {updateCustomerFittingRoom} from '~/lib/profile/customer.server';
import {NO_STORE, readListOperation} from '~/lib/profile/operation.server';

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
