import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import {CUSTOMER_PROFILE_QUERY} from '~/graphql/customer-account/CustomerProfileQueries';
import {METAFIELDS_SET_MUTATION} from '~/graphql/customer-account/CustomerProfileMutations';
import {
  normalizePreferences,
  parsePreferences,
  serializePreferences,
} from './preferences';
import {
  applyFavoriteOperation,
  parseFavorites,
  serializeFavorites,
} from './schema';
import {
  applyFittingRoomOperation,
  parseFittingRoom,
  serializeFittingRoom,
} from './fitting-room';
import type {ListOperation, PreferenceProfile} from './types';

type Context = Pick<HydrogenRouterContextProvider, 'customerAccount'>;

type CustomerProfile = {
  customerId: string | null;
  favorites: string[];
  fittingRoom: string[];
  preferences: PreferenceProfile;
};

export async function readCustomerProfile(context: Context): Promise<CustomerProfile> {
  const {data, errors} = await context.customerAccount.query(
    CUSTOMER_PROFILE_QUERY,
  );

  if (errors?.length) {
    throw new Error(errors[0].message);
  }

  const customer = data?.customer;
  if (!customer) {
    return {
      customerId: null,
      favorites: [],
      fittingRoom: [],
      preferences: normalizePreferences(null),
    };
  }

  return {
    customerId: customer.id,
    favorites: parseFavorites(customer.favorites?.value ?? null),
    fittingRoom: parseFittingRoom(customer.fittingRoom?.value ?? null),
    preferences: parsePreferences(customer.preferences?.value ?? null),
  };
}

export async function updateCustomerFavorites(
  context: Context,
  operation: ListOperation,
): Promise<string[]> {
  const profile = await readCustomerProfile(context);
  if (!profile.customerId) {
    throw new Error('Customer not found');
  }

  const value = serializeFavorites(
    applyFavoriteOperation(profile.favorites, operation),
  );
  const saved = await writeCustomerMetafield(
    context,
    profile.customerId,
    'favorites',
    value,
  );

  return parseFavorites(saved);
}

export async function updateCustomerFittingRoom(
  context: Context,
  operation: ListOperation,
): Promise<string[]> {
  const profile = await readCustomerProfile(context);
  if (!profile.customerId) {
    throw new Error('Customer not found');
  }

  const value = serializeFittingRoom(
    applyFittingRoomOperation(profile.fittingRoom, operation),
  );
  const saved = await writeCustomerMetafield(
    context,
    profile.customerId,
    'fitting_room',
    value,
  );

  return parseFittingRoom(saved);
}

export async function writeCustomerPreferences(
  context: Context,
  patch: Partial<PreferenceProfile>,
): Promise<PreferenceProfile> {
  const profile = await readCustomerProfile(context);
  if (!profile.customerId) {
    throw new Error('Customer not found');
  }

  const value = serializePreferences({
    ...profile.preferences,
    ...patch,
  });
  const saved = await writeCustomerMetafield(
    context,
    profile.customerId,
    'preferences',
    value,
  );

  return parsePreferences(saved);
}

async function writeCustomerMetafield(
  context: Context,
  customerId: string,
  key: string,
  value: string,
): Promise<string> {
  const {data, errors} = await context.customerAccount.mutate(
    METAFIELDS_SET_MUTATION,
    {
      variables: {
        metafields: [
          {
            ownerId: customerId,
            namespace: 'custom',
            key,
            type: 'json',
            value,
          },
        ],
      },
    },
  );

  if (errors?.length) {
    throw new Error(errors[0].message);
  }

  const result = data?.metafieldsSet;
  if (result?.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }

  return result?.metafields?.[0]?.value ?? value;
}
