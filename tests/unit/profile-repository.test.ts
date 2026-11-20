import {describe, expect, it} from 'vitest';
import {CustomerProfileRepository} from '../../app/lib/profile/customer.server';
import {FittingRoomList, MAX_FITTING_ROOM} from '../../app/lib/profile/fitting-room';
import {preferencesField} from '../../app/lib/profile/preferences';
import {ProfileField} from '../../app/lib/profile/profile-field';
import {FavoritesList, MAX_FAVORITES} from '../../app/lib/profile/schema';
import type {CustomerProfile} from '../../app/lib/profile/types';

const CUSTOMER_ID = 'gid://shopify/Customer/1';
const A = 'gid://shopify/Product/1';
const B = 'gid://shopify/Product/2';
const VA = 'gid://shopify/ProductVariant/1';
const VB = 'gid://shopify/ProductVariant/2';
const VC = 'gid://shopify/ProductVariant/3';

type Context = ConstructorParameters<typeof CustomerProfileRepository>[0];
type Write = {
  key: string;
  namespace: string;
  ownerId: string;
  type: string;
  value: string;
};

/** A fake Customer Account API: `customer` is the query result, writes are recorded. */
function fakeContext(customer: Record<string, unknown> | null) {
  const writes: Write[] = [];

  const context = {
    customerAccount: {
      query: async () => ({data: {customer}}),
      mutate: async (
        _mutation: string,
        options: {variables: {metafields: Write[]}},
      ) => {
        writes.push(options.variables.metafields[0]);
        return {
          data: {
            metafieldsSet: {
              metafields: [{value: options.variables.metafields[0].value}],
              userErrors: [],
            },
          },
        };
      },
    },
  } as unknown as Context;

  return {context, writes};
}

function profile(overrides: Partial<CustomerProfile> = {}): CustomerProfile {
  return {
    customerId: CUSTOMER_ID,
    favorites: [],
    fittingRoom: [],
    preferences: {allergies: [], skin: {}},
    ...overrides,
  };
}

/** A field added later (e.g. a wishlist note), to show new fields need no repository change. */
class NoteField extends ProfileField<string, string> {
  readonly key = 'note';

  parse(raw: string | null | undefined): string {
    return raw ? (JSON.parse(raw) as string) : '';
  }

  serialize(value: string): string {
    return JSON.stringify(value);
  }

  protected current(): string {
    return 'previous';
  }

  protected merge(current: string, change: string): string {
    return `${current} + ${change}`;
  }
}

describe('ProfileField template method', () => {
  it('builds the next value from the subclass steps', () => {
    expect(new NoteField().nextValue(profile(), 'new')).toBe(
      JSON.stringify('previous + new'),
    );
  });

  it('adds new favorites at the front of the stored list', () => {
    const next = new FavoritesList().nextValue(profile({favorites: [A]}), {
      add: [B],
    });

    expect(JSON.parse(next)).toEqual([B, A]);
  });

  it('reads the fitting room, not the favorites, for the fitting room list', () => {
    const next = new FittingRoomList().nextValue(
      profile({favorites: [A], fittingRoom: [VC]}),
      {add: [VB]},
    );

    expect(JSON.parse(next)).toEqual([VB, VC]);
  });

  it('keeps preference fields that the change leaves out', () => {
    const next = preferencesField.nextValue(
      profile({preferences: {allergies: ['nickel'], skin: {tone: 'fair'}}}),
      {preferredMaterials: ['silver']},
    );

    expect(JSON.parse(next)).toMatchObject({
      allergies: ['nickel'],
      skin: {tone: 'fair'},
      preferredMaterials: ['silver'],
    });
  });
});

describe('ProductIdList subclasses', () => {
  it('only differ in metafield key and cap', () => {
    expect(new FavoritesList()).toMatchObject({
      key: 'favorites',
      max: MAX_FAVORITES,
    });
    expect(new FittingRoomList()).toMatchObject({
      key: 'fitting_room',
      max: MAX_FITTING_ROOM,
    });
  });

  it('apply the cap of their own list', () => {
    const variants = Array.from(
      {length: MAX_FITTING_ROOM + 1},
      (_, index) => `gid://shopify/ProductVariant/${index + 1}`,
    );
    const products = Array.from(
      {length: MAX_FITTING_ROOM + 1},
      (_, index) => `gid://shopify/Product/${index + 1}`,
    );

    expect(new FittingRoomList().parse(JSON.stringify(variants))).toHaveLength(
      MAX_FITTING_ROOM,
    );
    expect(new FavoritesList().parse(JSON.stringify(products))).toHaveLength(
      MAX_FITTING_ROOM + 1,
    );
  });
});

describe('CustomerProfileRepository', () => {
  it('returns an empty profile when there is no customer', async () => {
    const {context} = fakeContext(null);

    await expect(new CustomerProfileRepository(context).read()).resolves.toEqual(
      {
        customerId: null,
        favorites: [],
        fittingRoom: [],
        preferences: {allergies: [], skin: {}},
      },
    );
  });

  it('writes any field to its own metafield in the custom namespace', async () => {
    const {context, writes} = fakeContext({id: CUSTOMER_ID});

    const saved = await new CustomerProfileRepository(context).update(
      new NoteField(),
      'new',
    );

    expect(saved).toBe('previous + new');
    expect(writes).toEqual([
      {
        ownerId: CUSTOMER_ID,
        namespace: 'custom',
        key: 'note',
        type: 'json',
        value: JSON.stringify('previous + new'),
      },
    ]);
  });

  it('refuses to write without a customer', async () => {
    const {context, writes} = fakeContext(null);

    await expect(
      new CustomerProfileRepository(context).update(new NoteField(), 'new'),
    ).rejects.toThrow('Customer not found');
    expect(writes).toEqual([]);
  });
});
