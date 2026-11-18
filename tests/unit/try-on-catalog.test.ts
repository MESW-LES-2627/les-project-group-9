import {describe, expect, it} from 'vitest';
import {
  DEFAULT_TRY_ON_SIZE_CM,
  parseTryOnSizeCm,
  resolveOverlayUrl,
  resolveTryOn,
  tryOnKind,
} from '../../app/lib/try-on/catalog';

const OVERLAY = 'https://cdn.shopify.com/s/files/1/0000/files/butterfly.png?v=1';
const EARRINGS = {category: {name: 'Earrings'}};

describe('tryOnKind', () => {
  it('accepts earrings and necklaces', () => {
    expect(tryOnKind({category: {name: 'Earrings'}})).toBe('earring');
    expect(tryOnKind({category: {name: 'Necklaces'}})).toBe('necklace');
  });

  it('ignores case, spaces and the singular form', () => {
    expect(tryOnKind({category: {name: ' necklaces '}})).toBe('necklace');
    expect(tryOnKind({category: {name: 'Earring'}})).toBe('earring');
  });

  it('rejects other jewellery and missing categories', () => {
    expect(tryOnKind({category: {name: 'Bracelets'}})).toBe(null);
    expect(tryOnKind({category: {name: 'Rings'}})).toBe(null);
    expect(tryOnKind({category: {name: 'Charms'}})).toBe(null);
    expect(tryOnKind({category: {name: 'Watches'}})).toBe(null);
    expect(tryOnKind({category: null})).toBe(null);
    expect(tryOnKind({})).toBe(null);
  });
});

describe('parseTryOnSizeCm', () => {
  it('parses decimal values with a dot or comma', () => {
    expect(parseTryOnSizeCm('2.5', 'earring')).toBe(2.5);
    expect(parseTryOnSizeCm(' 2,5 ', 'earring')).toBe(2.5);
    expect(parseTryOnSizeCm('16', 'necklace')).toBe(16);
  });

  it('falls back to the kind default when missing or implausible', () => {
    expect(parseTryOnSizeCm(null, 'earring')).toBe(
      DEFAULT_TRY_ON_SIZE_CM.earring,
    );
    expect(parseTryOnSizeCm('', 'necklace')).toBe(
      DEFAULT_TRY_ON_SIZE_CM.necklace,
    );
    expect(parseTryOnSizeCm('2cm', 'earring')).toBe(
      DEFAULT_TRY_ON_SIZE_CM.earring,
    );
    expect(parseTryOnSizeCm('0', 'earring')).toBe(DEFAULT_TRY_ON_SIZE_CM.earring);
    expect(parseTryOnSizeCm('-2', 'earring')).toBe(
      DEFAULT_TRY_ON_SIZE_CM.earring,
    );
    expect(parseTryOnSizeCm('150', 'necklace')).toBe(
      DEFAULT_TRY_ON_SIZE_CM.necklace,
    );
  });
});

describe('resolveOverlayUrl', () => {
  it('reads the variant metafield (image or generic file)', () => {
    expect(
      resolveOverlayUrl({
        tryOnOverlay: {reference: {image: {url: OVERLAY}}},
      }),
    ).toBe(OVERLAY);
    expect(
      resolveOverlayUrl({tryOnOverlay: {reference: {url: OVERLAY}}}),
    ).toBe(OVERLAY);
  });

  it('has no product-level fallback', () => {
    expect(resolveOverlayUrl({})).toBe(null);
    expect(resolveOverlayUrl({tryOnOverlay: {reference: null}})).toBe(null);
    expect(
      resolveOverlayUrl({tryOnOverlay: {reference: {image: {url: '   '}}}}),
    ).toBe(null);
  });
});

describe('resolveTryOn', () => {
  it('gates on the selected variant, not the product', () => {
    const clear = resolveTryOn(EARRINGS, {
      tryOnOverlay: {reference: {image: {url: OVERLAY}}},
      tryOnSize: {value: '1.8'},
    });
    const pink = resolveTryOn(EARRINGS, {
      tryOnOverlay: null,
      tryOnSize: {value: '1.8'},
    });

    expect(clear).toEqual({
      kind: 'earring',
      overlayUrl: `${OVERLAY}&cors=1`,
      sizeCm: 1.8,
    });
    expect(pink).toBe(null);
  });

  it('does not add the CORS param twice', () => {
    const piece = resolveTryOn(
      {category: {name: 'Necklaces'}},
      {tryOnOverlay: {reference: {image: {url: `${OVERLAY}&cors=1`}}}},
    );

    expect(piece?.overlayUrl).toBe(`${OVERLAY}&cors=1`);
  });

  it('hides the button for unsupported categories even with an overlay', () => {
    expect(
      resolveTryOn(
        {category: {name: 'Bracelets'}},
        {tryOnOverlay: {reference: {image: {url: OVERLAY}}}},
      ),
    ).toBe(null);
  });

  it('hides the button when there is no variant overlay', () => {
    expect(resolveTryOn(EARRINGS, null)).toBe(null);
    expect(resolveTryOn(EARRINGS, undefined)).toBe(null);
    expect(resolveTryOn(EARRINGS, {})).toBe(null);
  });

  it('uses the kind default size when the metafield is missing', () => {
    expect(
      resolveTryOn(
        {category: {name: 'Necklaces'}},
        {tryOnOverlay: {reference: {url: OVERLAY}}},
      )?.sizeCm,
    ).toBe(DEFAULT_TRY_ON_SIZE_CM.necklace);
  });
});
