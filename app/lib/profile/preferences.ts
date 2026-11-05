import type {PreferenceProfile} from './types';

export const ALLERGY_OPTIONS = ['nickel', 'zinc', 'cobalt'] as const;
export const SKIN_TONES = ['fair', 'light', 'medium', 'tan', 'deep'] as const;
export const UNDERTONES = ['cool', 'warm', 'neutral'] as const;

export const ALLERGY_LABELS: Record<(typeof ALLERGY_OPTIONS)[number], string> = {
  nickel: 'Nickel',
  zinc: 'Zinc',
  cobalt: 'Cobalt',
};

export function hasRecommendationPreferences(
  preferences: PreferenceProfile | null | undefined,
): boolean {
  if (!preferences) return false;

  return Boolean(
    preferences.skin?.tone ||
    preferences.skin?.undertone ||
    preferences.preferredMaterials?.length ||
    preferences.preferredColors?.length ||
    preferences.preferredGemstones?.length,
  );
}

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

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;

  const entries: Array<[string, string]> = [];

  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' && item.trim()) {
      entries.push([key, item.trim()]);
    }
  }

  return Object.fromEntries(entries);
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

  const preferences: PreferenceProfile = {allergies, skin};
  const ringSizes = stringRecord(source.ringSizes);
  const preferredMaterials = stringArray(source.preferredMaterials);
  const preferredColors = stringArray(source.preferredColors);
  const preferredGemstones = stringArray(source.preferredGemstones);

  if (ringSizes !== undefined) preferences.ringSizes = ringSizes;
  if (preferredMaterials !== undefined) {
    preferences.preferredMaterials = preferredMaterials;
  }
  if (preferredColors !== undefined) {
    preferences.preferredColors = preferredColors;
  }
  if (preferredGemstones !== undefined) {
    preferences.preferredGemstones = preferredGemstones;
  }

  return preferences;
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
