import {describe, expect, it} from 'vitest';
import {
  hasRecommendationPreferences,
  normalizePreferences,
  normalizePreferencesPatch,
  parsePreferences,
  preferencesField,
  serializePreferences,
} from '../../app/lib/profile/preferences';

describe('normalizePreferences', () => {
  it('returns empty preferences for invalid input', () => {
    expect(normalizePreferences(null)).toEqual({allergies: [], skin: {}});
    expect(normalizePreferences('nope')).toEqual({allergies: [], skin: {}});
  });

  it('keeps only supported allergies and skin values', () => {
    expect(
      normalizePreferences({
        allergies: ['nickel', 'unknown', 'nickel', 'cobalt'],
        skin: {tone: 'medium', undertone: 'hot'},
      }),
    ).toEqual({
      allergies: ['nickel', 'cobalt'],
      skin: {tone: 'medium'},
    });
  });

  it('preserves supported undertones', () => {
    expect(
      normalizePreferences({skin: {undertone: 'warm'}}),
    ).toEqual({allergies: [], skin: {undertone: 'warm'}});
  });

  it('preserves fields that the profile form does not edit', () => {
    expect(
      normalizePreferences({
        preferredMaterials: ['gold-plated', '', 'gold-plated', 42],
        preferredColors: ['gold'],
        preferredGemstones: ['moonstone'],
        ringSizes: {'left-ring': ' 6.5 ', 'right-thumb': '', bogus: '7'},
      }),
    ).toEqual({
      allergies: [],
      skin: {},
      preferredMaterials: ['gold-plated'],
      preferredColors: ['gold'],
      preferredGemstones: ['moonstone'],
      ringSizes: {'left-ring': '6.5'},
    });
  });

  it('keeps ring sizes for the ten fingers of both hands', () => {
    expect(
      normalizePreferences({
        ringSizes: {
          'left-thumb': '4',
          'left-index': '4.5',
          'left-middle': '13',
          'left-ring': '6',
          'left-pinky': '7',
          'right-thumb': '8',
          'right-index': '9.5',
          'right-middle': '10',
          'right-ring': '11',
          'right-pinky': '12',
        },
      }).ringSizes,
    ).toEqual({
      'left-thumb': '4',
      'left-index': '4.5',
      'left-middle': '13',
      'left-ring': '6',
      'left-pinky': '7',
      'right-thumb': '8',
      'right-index': '9.5',
      'right-middle': '10',
      'right-ring': '11',
      'right-pinky': '12',
    });
  });

  it('drops sizes outside US 4 to 13 or not in half steps', () => {
    expect(
      normalizePreferences({
        ringSizes: {
          'left-ring': '3.5',
          'left-index': '13.5',
          'left-middle': '6.25',
          'left-pinky': 'US 6',
          'right-ring': '14',
          'right-pinky': '6',
        },
      }).ringSizes,
    ).toEqual({'right-pinky': '6'});
  });

  it('ignores ring sizes that are not a record', () => {
    expect(normalizePreferences({ringSizes: ['6']}).ringSizes).toBeUndefined();
  });

  it('preserves explicit empty values', () => {
    expect(normalizePreferences({preferredColors: [], ringSizes: {}})).toEqual({
      allergies: [],
      skin: {},
      preferredColors: [],
      ringSizes: {},
    });
  });
});

describe('parsePreferences', () => {
  it('parses a JSON value', () => {
    expect(
      parsePreferences(
        JSON.stringify({
          allergies: ['nickel'],
          skin: {tone: 'light', undertone: 'cool'},
        }),
      ),
    ).toEqual({
      allergies: ['nickel'],
      skin: {tone: 'light', undertone: 'cool'},
    });
  });

  it('returns empty preferences for invalid JSON', () => {
    expect(parsePreferences('{')).toEqual({allergies: [], skin: {}});
  });
});

describe('serializePreferences', () => {
  it('round-trips through parsePreferences', () => {
    const preferences = {
      allergies: ['cobalt'],
      skin: {tone: 'tan', undertone: 'neutral'},
      preferredMaterials: ['gold-plated'],
      preferredGemstones: ['moonstone'],
      ringSizes: {'left-ring': '6'},
    };

    expect(parsePreferences(serializePreferences(preferences))).toEqual(
      preferences,
    );
  });
});

describe('normalizePreferencesPatch', () => {
  it('returns only the keys present in the payload', () => {
    expect(normalizePreferencesPatch({ringSizes: {'left-ring': '6'}})).toEqual(
      {ringSizes: {'left-ring': '6'}},
    );
  });

  it('returns an empty patch for invalid input', () => {
    expect(normalizePreferencesPatch(null)).toEqual({});
    expect(normalizePreferencesPatch('nope')).toEqual({});
  });

  it('keeps an explicit empty allergy list as an update', () => {
    expect(normalizePreferencesPatch({allergies: []})).toEqual({
      allergies: [],
    });
  });
});

describe('preferencesField', () => {
  const profile = {
    customerId: 'gid://shopify/Customer/1',
    favorites: [],
    fittingRoom: [],
    preferences: {
      allergies: ['nickel', 'zinc'],
      skin: {tone: 'medium', undertone: 'warm'},
      ringSizes: {'left-ring': '6'},
      preferredColors: ['gold'],
      preferredMaterials: ['gold-plated'],
    },
  };

  function stored(change: Parameters<typeof preferencesField.nextValue>[1]) {
    return parsePreferences(preferencesField.nextValue(profile, change));
  }

  it('replaces the stored value when a preference changes', () => {
    expect(stored({allergies: ['cobalt']}).allergies).toEqual(['cobalt']);
    expect(stored({preferredColors: ['silver']}).preferredColors).toEqual([
      'silver',
    ]);
    expect(stored({ringSizes: {'right-ring': '7'}}).ringSizes).toEqual({
      'right-ring': '7',
    });
  });

  it('drops a preference that is deleted', () => {
    expect(stored({allergies: []}).allergies).toEqual([]);
    expect(stored({preferredMaterials: []}).preferredMaterials).toEqual([]);
    expect(stored({skin: {}}).skin).toEqual({});
  });

  it('keeps the preferences the change does not touch', () => {
    const preferences = stored({allergies: []});

    expect(preferences.skin).toEqual({
      tone: 'medium',
      undertone: 'warm',
    });
    expect(preferences.preferredColors).toEqual(['gold']);
    expect(preferences.ringSizes).toEqual({'left-ring': '6'});
  });
});

describe('hasRecommendationPreferences', () => {
  it('ignores preferences that are not used for suggestions', () => {
    expect(hasRecommendationPreferences(null)).toBe(false);
    expect(hasRecommendationPreferences({skin: {tone: 'medium'}})).toBe(false);
    expect(hasRecommendationPreferences({allergies: ['nickel']})).toBe(false);
    expect(hasRecommendationPreferences({ringSizes: {'left-ring': '6'}})).toBe(
      false,
    );
  });

  it('accepts undertone, materials, colours and gemstones', () => {
    expect(hasRecommendationPreferences({skin: {undertone: 'warm'}})).toBe(
      true,
    );
    expect(
      hasRecommendationPreferences({preferredMaterials: ['gold-plated']}),
    ).toBe(true);
    expect(hasRecommendationPreferences({preferredColors: ['gold']})).toBe(
      true,
    );
    expect(
      hasRecommendationPreferences({preferredGemstones: ['moonstone']}),
    ).toBe(true);
  });
});
