import type {PreferenceProfile} from './types';

export const ALLERGY_OPTIONS = ['nickel', 'gold-plated', 'latex'] as const;
export const SKIN_TONES = ['fair', 'light', 'medium', 'tan', 'deep'] as const;
export const UNDERTONES = ['cool', 'warm', 'neutral'] as const;

export const ALLERGY_LABELS: Record<(typeof ALLERGY_OPTIONS)[number], string> = {
  nickel: 'Nickel',
  'gold-plated': 'Gold-plated',
  latex: 'Latex',
};

type Skin = NonNullable<PreferenceProfile['skin']>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function allowedValue<T extends string>(
  value: unknown,
  options: readonly T[],
): T | undefined {
  return typeof value === 'string' && options.includes(value as T)
    ? (value as T)
    : undefined;
}

export function normalizePreferences(input: unknown): PreferenceProfile {
  const source = isRecord(input) ? input : {};
  const allergies = Array.isArray(source.allergies)
    ? Array.from(
        new Set(
          source.allergies.filter(
            (value): value is (typeof ALLERGY_OPTIONS)[number] =>
              allowedValue(value, ALLERGY_OPTIONS) !== undefined,
          ),
        ),
      )
    : [];

  const skinSource = isRecord(source.skin) ? source.skin : {};
  const skin: Skin = {};
  const tone = allowedValue(skinSource.tone, SKIN_TONES);
  const undertone = allowedValue(skinSource.undertone, UNDERTONES);

  if (tone) skin.tone = tone;
  if (undertone) skin.undertone = undertone;

  return {allergies, skin};
}

export function parsePreferences(
  raw: string | null | undefined,
): PreferenceProfile {
  if (!raw) return normalizePreferences(null);

  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return normalizePreferences(null);
  }
}

export function serializePreferences(profile: PreferenceProfile): string {
  return JSON.stringify(normalizePreferences(profile));
}
