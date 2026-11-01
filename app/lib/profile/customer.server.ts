import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import {CUSTOMER_PROFILE_QUERY} from '~/graphql/customer-account/CustomerProfileQueries';
import {METAFIELDS_SET_MUTATION} from '~/graphql/customer-account/CustomerProfileMutations';
import {applyFavoriteOperation, parseFavorites, serializeFavorites} from './schema';
import type {FavoriteOperation} from './types';

type Context = Pick<HydrogenRouterContextProvider, 'customerAccount'>;

type FavoriteState = {
  customerId: string | null;
  favorites: string[];
};

async function readFavorites(context: Context): Promise<FavoriteState> {
  const {data, errors} = await context.customerAccount.query(
    CUSTOMER_PROFILE_QUERY,
  );

  if (errors?.length) {
    throw new Error(errors[0].message);
  }

  const customer = data?.customer;
  if (!customer) {
    return {customerId: null, favorites: []};
  }

  return {
    customerId: customer.id,
    favorites: parseFavorites(customer.favorites?.value ?? null),
  };
}

export async function readCustomerFavorites(
  context: Context,
): Promise<string[]> {
  return (await readFavorites(context)).favorites;
}

export async function updateCustomerFavorites(
  context: Context,
  operation: FavoriteOperation,
): Promise<string[]> {
  const state = await readFavorites(context);
  if (!state.customerId) {
    throw new Error('Customer not found');
  }

  return writeCustomerFavorites(
    context,
    state.customerId,
    applyFavoriteOperation(state.favorites, operation),
  );
}

async function writeCustomerFavorites(
  context: Context,
  customerId: string,
  favorites: string[],
): Promise<string[]> {
  const value = serializeFavorites(favorites);
  const {data, errors} = await context.customerAccount.mutate(
    METAFIELDS_SET_MUTATION,
    {
      variables: {
        metafields: [
          {
            ownerId: customerId,
            namespace: 'custom',
            key: 'favorites',
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

  return parseFavorites(result?.metafields?.[0]?.value ?? value);
}
