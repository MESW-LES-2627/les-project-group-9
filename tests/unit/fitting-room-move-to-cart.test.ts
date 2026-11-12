import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('~/lib/products.server', () => ({
  loadProductsByIds: vi.fn(),
  parseProductIds: vi.fn(),
}));

vi.mock('~/lib/profile/customer.server', () => ({
  updateCustomerFittingRoom: vi.fn(),
}));

import {action} from '../../app/routes/fitting-room';
import type {CatalogProduct} from '~/lib/jeweliette-catalog';
import {updateCustomerFittingRoom} from '~/lib/profile/customer.server';
import {loadProductsByIds} from '~/lib/products.server';

type ActionArgs = Parameters<typeof action>[0];

const PRODUCT_ID = 'gid://shopify/Product/1';
const VARIANT_ID = 'gid://shopify/ProductVariant/1';

function contextWith({
  loggedIn = true,
  language = 'EN',
}: {loggedIn?: boolean; language?: 'EN' | 'PT_PT' | 'FR'} = {}) {
  const addLines = vi.fn().mockResolvedValue({cart: {id: 'cart-1'}});
  const setCartId = vi
    .fn()
    .mockReturnValue(new Headers({'Set-Cookie': 'cart=1'}));
  const context = {
    customerAccount: {isLoggedIn: async () => loggedIn},
    cart: {addLines, setCartId},
    storefront: {i18n: {language, country: 'US'}},
  } as unknown as ActionArgs['context'];

  return {context, addLines, setCartId};
}

function product(availableForSale = true): CatalogProduct {
  return {
    id: PRODUCT_ID,
    title: 'Round Signet Ring',
    handle: 'round-signet-ring',
    priceRange: {minVariantPrice: {amount: '38.0', currencyCode: 'EUR'}},
    selectedOrFirstAvailableVariant: {
      id: VARIANT_ID,
      availableForSale,
    },
  };
}

function callAction(context: ActionArgs['context'], productId = PRODUCT_ID) {
  const body = new URLSearchParams({productId});

  return action({
    request: new Request('http://localhost/fitting-room', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body,
    }),
    context,
    params: {},
  } as ActionArgs);
}

beforeEach(() => {
  vi.mocked(loadProductsByIds).mockReset();
  vi.mocked(updateCustomerFittingRoom).mockReset();
});

describe('POST /fitting-room', () => {
  it('adds the first available variant to the cart and removes the piece', async () => {
    vi.mocked(loadProductsByIds).mockResolvedValue([product()]);
    vi.mocked(updateCustomerFittingRoom).mockResolvedValue([]);
    const {context, addLines, setCartId} = contextWith();

    const result = await callAction(context);

    expect(addLines).toHaveBeenCalledWith([
      {merchandiseId: VARIANT_ID, quantity: 1},
    ]);
    expect(setCartId).toHaveBeenCalledWith('cart-1');
    expect(updateCustomerFittingRoom).toHaveBeenCalledWith(context, {
      remove: [PRODUCT_ID],
    });
    expect(result.data).toMatchObject({
      fittingRoom: [],
      cart: {id: 'cart-1'},
    });
    expect(new Headers(result.init?.headers).get('Set-Cookie')).toBe('cart=1');
  });

  it('rejects guests', async () => {
    const {context, addLines} = contextWith({loggedIn: false});

    const result = await callAction(context);

    expect(result.init?.status).toBe(401);
    expect(result.data).toEqual({error: 'Unauthorized'});
    expect(addLines).not.toHaveBeenCalled();
  });

  it('rejects invalid product IDs', async () => {
    const {context} = contextWith();

    const result = await callAction(context, 'not-a-product');

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({error: 'Invalid product'});
  });

  it('rejects pieces without an available variant', async () => {
    vi.mocked(loadProductsByIds).mockResolvedValue([product(false)]);
    const {context, addLines} = contextWith();

    const result = await callAction(context);

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({error: 'This piece is sold out'});
    expect(addLines).not.toHaveBeenCalled();
  });

  it.each([
    ['PT_PT', 'Esta peça está esgotada'],
    ['FR', 'Cette pièce est épuisée'],
  ] as const)(
    'returns the sold-out message in the shopper language (%s)',
    async (language, message) => {
      vi.mocked(loadProductsByIds).mockResolvedValue([product(false)]);
      const {context} = contextWith({language});

      const result = await callAction(context);

      expect(result.data).toEqual({error: message});
    },
  );

  it('does not remove the piece when the cart add fails', async () => {
    vi.mocked(loadProductsByIds).mockResolvedValue([product()]);
    const {context, addLines} = contextWith();
    addLines.mockResolvedValueOnce({
      cart: {id: 'cart-1'},
      errors: [{message: 'Cart error'}],
    });

    const result = await callAction(context);

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({error: 'Cart error'});
    expect(updateCustomerFittingRoom).not.toHaveBeenCalled();
  });

  it('does not remove the piece when the cart returns user errors', async () => {
    vi.mocked(loadProductsByIds).mockResolvedValue([product()]);
    const {context, addLines} = contextWith();
    addLines.mockResolvedValueOnce({
      cart: {id: 'cart-1'},
      userErrors: [{message: 'Not available'}],
    });

    const result = await callAction(context);

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({error: 'Not available'});
    expect(updateCustomerFittingRoom).not.toHaveBeenCalled();
  });

  it('keeps the cart cookie when removing from the fitting room fails', async () => {
    vi.mocked(loadProductsByIds).mockResolvedValue([product()]);
    vi.mocked(updateCustomerFittingRoom).mockRejectedValue(
      new Error('No access'),
    );
    const {context} = contextWith();

    const result = await callAction(context);

    expect(result.init?.status).toBe(400);
    // The internal message is logged, not shown.
    expect(result.data).toEqual({error: 'Could not remove from fitting room'});
    expect(new Headers(result.init?.headers).get('Set-Cookie')).toBe('cart=1');
  });
});
