import {describe, expect, it} from 'vitest';
import {
  ENGRAVING_LENGTH_CAP,
  customizationAttributes,
  customizationLineDetails,
  hasCustomizationAttributes,
  initialCustomizationChoice,
  isAllowedGemColor,
  isEngravingWithinLimit,
  validateCustomizationAttributes,
  parseEngravingMaxLength,
  parseGemColorChoices,
  parseProductCustomization,
  type ProductCustomization,
} from '~/lib/customization';

const mf = (value: string) => ({value});

describe('parseProductCustomization', () => {
  it('returns null when the product is not marked as customizable', () => {
    expect(parseProductCustomization({})).toBeNull();
    expect(
      parseProductCustomization({
        customizable: mf('false'),
        customizationGemColors: mf('["Ruby"]'),
        engravingMaxLength: mf('10'),
      }),
    ).toBeNull();
  });

  it('returns the allowed gem colors and engraving limit', () => {
    expect(
      parseProductCustomization({
        customizable: mf('true'),
        customizationGemColors: mf('["Ruby red", "Sapphire"]'),
        engravingMaxLength: mf('12'),
      }),
    ).toEqual({
      gemColors: [
        {value: 'ruby-red', label: 'Ruby red'},
        {value: 'sapphire', label: 'Sapphire'},
      ],
      engravingMaxLength: 12,
    });
  });

  it('keeps one option when only gem colors or only engraving is set', () => {
    expect(
      parseProductCustomization({
        customizable: mf('true'),
        customizationGemColors: mf('["Ruby"]'),
      }),
    ).toEqual({
      gemColors: [{value: 'ruby', label: 'Ruby'}],
      engravingMaxLength: null,
    });
    expect(
      parseProductCustomization({
        customizable: mf('true'),
        engravingMaxLength: mf('8'),
      }),
    ).toEqual({gemColors: [], engravingMaxLength: 8});
  });

  it('returns null when customizable but no valid option is set', () => {
    expect(parseProductCustomization({customizable: mf('true')})).toBeNull();
    expect(
      parseProductCustomization({
        customizable: mf('true'),
        customizationGemColors: mf('not json'),
        engravingMaxLength: mf('0'),
      }),
    ).toBeNull();
  });
});

describe('parseGemColorChoices', () => {
  it('trims labels and removes duplicates by slug', () => {
    expect(parseGemColorChoices('[" Ruby red ", "ruby red", "Safira"]')).toEqual([
      {value: 'ruby-red', label: 'Ruby red'},
      {value: 'safira', label: 'Safira'},
    ]);
  });

  it.each([null, '', 'not json', '"Ruby"', '{"a":1}', '[1, null, "  "]'])(
    'returns no choices for %j',
    (value) => {
      expect(parseGemColorChoices(value)).toEqual([]);
    },
  );
});

describe('parseEngravingMaxLength', () => {
  it('accepts a positive integer', () => {
    expect(parseEngravingMaxLength('12')).toBe(12);
  });

  it('caps the limit', () => {
    expect(parseEngravingMaxLength('999')).toBe(ENGRAVING_LENGTH_CAP);
  });

  it.each([null, '', '0', '-3', '2.5', 'abc'])('returns null for %j', (value) => {
    expect(parseEngravingMaxLength(value)).toBeNull();
  });
});

describe('choice validation', () => {
  const customization: ProductCustomization = {
    gemColors: [{value: 'ruby', label: 'Ruby'}],
    engravingMaxLength: 5,
  };

  it('accepts only the gem colors the admin allowed', () => {
    expect(isAllowedGemColor(customization, 'ruby')).toBe(true);
    expect(isAllowedGemColor(customization, 'emerald')).toBe(false);
  });

  it('enforces the engraving limit', () => {
    expect(isEngravingWithinLimit(customization, 'Ana')).toBe(true);
    expect(isEngravingWithinLimit(customization, 'Maria')).toBe(true);
    expect(isEngravingWithinLimit(customization, 'Mariana')).toBe(false);
  });

  it('rejects any engraving when engraving is not offered', () => {
    expect(
      isEngravingWithinLimit({...customization, engravingMaxLength: null}, 'A'),
    ).toBe(false);
  });
});

describe('customizationAttributes', () => {
  const customization: ProductCustomization = {
    gemColors: [
      {value: 'ruby-red', label: 'Ruby red'},
      {value: 'sapphire', label: 'Sapphire'},
    ],
    engravingMaxLength: 10,
  };

  it('starts with the first gem color and no engraving', () => {
    expect(initialCustomizationChoice(customization)).toEqual({
      gemColor: 'ruby-red',
      engraving: '',
    });
    expect(initialCustomizationChoice(null)).toEqual({gemColor: '', engraving: ''});
  });

  it('stores the gem color by its label and the trimmed engraving', () => {
    expect(
      customizationAttributes(customization, {
        gemColor: 'sapphire',
        engraving: '  Ana  ',
      }),
    ).toEqual([
      {key: 'Gem color', value: 'Sapphire'},
      {key: 'Engraving', value: 'Ana'},
    ]);
  });

  it('leaves out an empty engraving and unknown gem colors', () => {
    expect(
      customizationAttributes(customization, {gemColor: 'emerald', engraving: '   '}),
    ).toEqual([]);
  });

  it('adds nothing for a product that is not customizable', () => {
    expect(
      customizationAttributes(null, {gemColor: 'ruby-red', engraving: 'Ana'}),
    ).toEqual([]);
  });
});

describe('validateCustomizationAttributes', () => {
  const customization: ProductCustomization = {
    gemColors: [{value: 'ruby-red', label: 'Ruby red'}],
    engravingMaxLength: 5,
  };
  const gem = (value: string) => ({key: 'Gem color', value});
  const engraving = (value: string) => ({key: 'Engraving', value});

  it('accepts allowed choices and normalises them', () => {
    expect(
      validateCustomizationAttributes(customization, [
        gem('RUBY red'),
        engraving(' Ana '),
        {key: 'gift_note', value: 'Hi'},
      ]),
    ).toEqual({
      ok: true,
      attributes: [
        {key: 'Gem color', value: 'Ruby red'},
        {key: 'Engraving', value: 'Ana'},
        {key: 'gift_note', value: 'Hi'},
      ],
    });
  });

  it('drops a blank engraving', () => {
    expect(
      validateCustomizationAttributes(customization, [engraving('   ')]),
    ).toEqual({ok: true, attributes: []});
  });

  it('rejects customization on a product that is not customizable', () => {
    expect(validateCustomizationAttributes(null, [gem('Ruby red')])).toEqual({
      ok: false,
      error: 'not-customizable',
    });
  });

  it('rejects a gem color the admin did not allow', () => {
    expect(
      validateCustomizationAttributes(customization, [gem('Emerald')]),
    ).toEqual({ok: false, error: 'gem-color-not-allowed'});
  });

  it.each(['Mariana', 'A\nB', 'A\u0000'])(
    'rejects the engraving %j',
    (value) => {
      expect(
        validateCustomizationAttributes(customization, [engraving(value)]),
      ).toEqual({ok: false, error: 'engraving-not-allowed'});
    },
  );

  it('rejects an engraving when the product offers none', () => {
    expect(
      validateCustomizationAttributes(
        {...customization, engravingMaxLength: null},
        [engraving('A')],
      ),
    ).toEqual({ok: false, error: 'engraving-not-allowed'});
  });

  it('rejects the same customization key twice', () => {
    expect(
      validateCustomizationAttributes(customization, [
        gem('Ruby red'),
        gem('Ruby red'),
      ]),
    ).toEqual({ok: false, error: 'duplicate-attribute'});
  });
});

describe('customization helpers for cart lines', () => {
  it('detects customization attributes', () => {
    expect(hasCustomizationAttributes([{key: 'Engraving', value: 'A'}])).toBe(true);
    expect(hasCustomizationAttributes([{key: 'gift_note', value: 'A'}])).toBe(false);
    expect(hasCustomizationAttributes(null)).toBe(false);
  });

  it('lists the details of a line in a fixed order', () => {
    expect(
      customizationLineDetails([
        {key: 'Engraving', value: 'Ana'},
        {key: 'gift_note', value: 'Hi'},
        {key: 'Gem color', value: 'Ruby'},
      ]),
    ).toEqual([
      {field: 'gemColor', value: 'Ruby'},
      {field: 'engraving', value: 'Ana'},
    ]);
    expect(customizationLineDetails([{key: 'Engraving', value: null}])).toEqual([]);
  });
});
