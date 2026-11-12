import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import {CUSTOMER_PROFILE_QUERY} from '~/graphql/customer-account/CustomerProfileQueries';
import {METAFIELDS_SET_MUTATION} from '~/graphql/customer-account/CustomerProfileMutations';
import {normalizePreferences, preferencesField} from './preferences';
import type {ProfileField} from './profile-field';
import {favoritesList} from './schema';
import {fittingRoomList} from './fitting-room';
import type {
  CustomerProfile,
  ListOperation,
  PreferenceProfile,
} from './types';

type Context = Pick<HydrogenRouterContextProvider, 'customerAccount'>;

/**
 * Reads and writes the logged-in customer's profile (Repository). Hides the
 * Customer Account API and the metafield storage: callers work with
 * `CustomerProfile` values and `ProfileField`s only.
 */
export class CustomerProfileRepository {
  readonly #context: Context;

  constructor(context: Context) {
    this.#context = context;
  }

  async read(): Promise<CustomerProfile> {
    const {data, errors} = await this.#context.customerAccount.query(
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
      favorites: favoritesList.parse(customer.favorites?.value ?? null),
      fittingRoom: fittingRoomList.parse(customer.fittingRoom?.value ?? null),
      preferences: preferencesField.parse(customer.preferences?.value ?? null),
    };
  }

  async update<T, Change>(
    field: ProfileField<T, Change>,
    change: Change,
  ): Promise<T> {
    const profile = await this.read();
    if (!profile.customerId) {
      throw new Error('Customer not found');
    }

    const saved = await this.#writeMetafield(
      profile.customerId,
      field.key,
      field.nextValue(profile, change),
    );

    return field.parse(saved);
  }

  async #writeMetafield(
    customerId: string,
    key: string,
    value: string,
  ): Promise<string> {
    const {data, errors} = await this.#context.customerAccount.mutate(
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
}

export function readCustomerProfile(
  context: Context,
): Promise<CustomerProfile> {
  return new CustomerProfileRepository(context).read();
}

export function updateCustomerFavorites(
  context: Context,
  operation: ListOperation,
): Promise<string[]> {
  return new CustomerProfileRepository(context).update(favoritesList, operation);
}

export function updateCustomerFittingRoom(
  context: Context,
  operation: ListOperation,
): Promise<string[]> {
  return new CustomerProfileRepository(context).update(
    fittingRoomList,
    operation,
  );
}

export function writeCustomerPreferences(
  context: Context,
  patch: Partial<PreferenceProfile>,
): Promise<PreferenceProfile> {
  return new CustomerProfileRepository(context).update(preferencesField, patch);
}
