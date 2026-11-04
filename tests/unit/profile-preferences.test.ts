import {describe, expect, it} from 'vitest';
import {
  normalizePreferences,
  parsePreferences,
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
        ringSizes: {'ring-1': ' 52 ', 'ring-2': '', bad: 7},
      }),
    ).toEqual({
      allergies: [],
      skin: {},
      preferredMaterials: ['gold-plated'],
      preferredColors: ['gold'],
      preferredGemstones: ['moonstone'],
      ringSizes: {'ring-1': '52'},
    });
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
      ringSizes: {'ring-1': '52'},
    };

    expect(parsePreferences(serializePreferences(preferences))).toEqual(
      preferences,
    );
  });
});
