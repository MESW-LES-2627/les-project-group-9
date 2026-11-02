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
        allergies: ['nickel', 'unknown', 'nickel', 'latex'],
        skin: {tone: 'medium', undertone: 'hot'},
      }),
    ).toEqual({
      allergies: ['nickel', 'latex'],
      skin: {tone: 'medium'},
    });
  });

  it('preserves supported undertones', () => {
    expect(
      normalizePreferences({skin: {undertone: 'warm'}}),
    ).toEqual({allergies: [], skin: {undertone: 'warm'}});
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
      allergies: ['gold-plated'],
      skin: {tone: 'tan', undertone: 'neutral'},
    };

    expect(parsePreferences(serializePreferences(preferences))).toEqual(
      preferences,
    );
  });
});
