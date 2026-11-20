import {beforeEach, describe, expect, it, vi} from 'vitest';
import {CartForm} from '@shopify/hydrogen';
import {action} from '../../app/routes/cart';
import {validateCartLinesCustomization} from '~/lib/customization.server';

type ActionArgs = Parameters<typeof action>[0];

const VARIANT_ID = 'gid://shopify/ProductVariant/1';
const OTHER_VARIANT_ID = 'gid://shopify/ProductVariant/2';

const customizableProduct = {
  customizable: {value: 'true'},
  customizationGemColors: {value: '["Ruby red", "Sapphire"]'},
  engravingMaxLength: {value: '5'},
};

function storefrontWith(products: Record<string, object>) {
  return {
    query: vi.fn().mockResolvedValue({
      nodes: Object.entries(products).map(([id, product]) => ({id, product})),
    }),
    CacheNone: vi.fn(() => ({mode: 'no-store'})),
  };
}

function contextWith(products: Record<string, object> = {}) {
  const storefront = storefrontWith(products);
  const addLines = vi.fn().mockResolvedValue({cart: {id: 'cart-1'}});
  const updateLines = vi.fn().mockResolvedValue({cart: {id: 'cart-1'}});
  const setCartId = vi.fn().mockReturnValue(new Headers());
  const context = {
    storefront,
    cart: {addLines, updateLines, setCartId},
  } as unknown as ActionArgs['context'];

  return {context, storefront, addLines, updateLines};
}

function cartRequest(action: string, inputs: object) {
  const body = new FormData();
  body.set(CartForm.INPUT_NAME, JSON.stringify({action, inputs}));
  return new Request('https://shop.test/cart', {method: 'POST', body});
}

async function runAction(
  context: ActionArgs['context'],
  request: Request,
): Promise<{status: number; body: {errors?: unknown}}> {
  const result = (await action({
    request,
    context,
    params: {},
  } as ActionArgs)) as unknown as {
    data: {errors?: unknown};
    init: ResponseInit | null;
  };
  return {status: result.init?.status ?? 200, body: result.data};
}

describe('validateCartLinesCustomization', () => {
  it('passes lines without customization through without a query', async () => {
    const {context, storefront} = contextWith();
    const lines = [{merchandiseId: VARIANT_ID, quantity: 1}];

    await expect(
      validateCartLinesCustomization(context, lines),
    ).resolves.toEqual({ok: true, lines});
    expect(storefront.query).not.toHaveBeenCalled();
  });

  it('checks the product live and normalises the attributes', async () => {
    const {context, storefront} = contextWith({[VARIANT_ID]: customizableProduct});

    await expect(
      validateCartLinesCustomization(context, [
        {
          merchandiseId: VARIANT_ID,
          quantity: 1,
          attributes: [
            {key: 'Gem color', value: 'sapphire'},
            {key: 'Engraving', value: ' Ana '},
          ],
        },
        {merchandiseId: OTHER_VARIANT_ID, quantity: 1},
      ]),
    ).resolves.toEqual({
      ok: true,
      lines: [
        {
          merchandiseId: VARIANT_ID,
          quantity: 1,
          attributes: [
            {key: 'Gem color', value: 'Sapphire'},
            {key: 'Engraving', value: 'Ana'},
          ],
        },
        {merchandiseId: OTHER_VARIANT_ID, quantity: 1},
      ],
    });
    expect(storefront.query).toHaveBeenCalledWith(expect.any(String), {
      variables: {ids: [VARIANT_ID]},
      cache: {mode: 'no-store'},
    });
  });

  it('rejects customization on a product that is not customizable', async () => {
    const {context} = contextWith({
      [VARIANT_ID]: {customizable: {value: 'false'}},
    });

    await expect(
      validateCartLinesCustomization(context, [
        {
          merchandiseId: VARIANT_ID,
          quantity: 1,
          attributes: [{key: 'Engraving', value: 'Ana'}],
        },
      ]),
    ).resolves.toEqual({ok: false, error: 'not-customizable'});
  });

  it('rejects an unknown variant', async () => {
    const {context} = contextWith({});

    await expect(
      validateCartLinesCustomization(context, [
        {
          merchandiseId: VARIANT_ID,
          quantity: 1,
          attributes: [{key: 'Gem color', value: 'Ruby red'}],
        },
      ]),
    ).resolves.toEqual({ok: false, error: 'not-customizable'});
  });
});

describe('cart action customization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a line with a valid customization', async () => {
    const {context, addLines} = contextWith({[VARIANT_ID]: customizableProduct});

    const {status} = await runAction(
      context,
      cartRequest(CartForm.ACTIONS.LinesAdd, {
        lines: [
          {
            merchandiseId: VARIANT_ID,
            quantity: 1,
            attributes: [{key: 'Engraving', value: 'Ana'}],
          },
        ],
      }),
    );

    expect(status).toBe(200);
    expect(addLines).toHaveBeenCalledWith([
      {
        merchandiseId: VARIANT_ID,
        quantity: 1,
        attributes: [{key: 'Engraving', value: 'Ana'}],
      },
    ]);
  });

  it('rejects an engraving longer than the limit without touching the cart', async () => {
    const {context, addLines} = contextWith({[VARIANT_ID]: customizableProduct});

    const {status, body} = await runAction(
      context,
      cartRequest(CartForm.ACTIONS.LinesAdd, {
        lines: [
          {
            merchandiseId: VARIANT_ID,
            quantity: 1,
            attributes: [{key: 'Engraving', value: 'Too long'}],
          },
        ],
      }),
    );

    expect(status).toBe(400);
    expect(body.errors).toEqual([{code: 'engraving-not-allowed'}]);
    expect(addLines).not.toHaveBeenCalled();
  });

  it('rejects a gem color the admin did not allow', async () => {
    const {context, addLines} = contextWith({[VARIANT_ID]: customizableProduct});

    const {status, body} = await runAction(
      context,
      cartRequest(CartForm.ACTIONS.LinesAdd, {
        lines: [
          {
            merchandiseId: VARIANT_ID,
            quantity: 1,
            attributes: [{key: 'Gem color', value: 'Emerald'}],
          },
        ],
      }),
    );

    expect(status).toBe(400);
    expect(body.errors).toEqual([{code: 'gem-color-not-allowed'}]);
    expect(addLines).not.toHaveBeenCalled();
  });

  it('rejects changing a customization through a line update', async () => {
    const {context, updateLines} = contextWith();

    const {status} = await runAction(
      context,
      cartRequest(CartForm.ACTIONS.LinesUpdate, {
        lines: [
          {id: 'line-1', attributes: [{key: 'Engraving', value: 'Hacked'}]},
        ],
      }),
    );

    expect(status).toBe(400);
    expect(updateLines).not.toHaveBeenCalled();
  });

  it('still updates quantities', async () => {
    const {context, updateLines} = contextWith();

    const {status} = await runAction(
      context,
      cartRequest(CartForm.ACTIONS.LinesUpdate, {
        lines: [{id: 'line-1', quantity: 2}],
      }),
    );

    expect(status).toBe(200);
    expect(updateLines).toHaveBeenCalledWith([{id: 'line-1', quantity: 2}]);
  });
});
