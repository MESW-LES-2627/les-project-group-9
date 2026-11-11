import type {
  PreferenceProfile,
  RingFinger,
  RingFingerName,
  RingHand,
} from './types';

export const ALLERGY_OPTIONS = ['nickel', 'zinc', 'cobalt'] as const;
export const SKIN_TONES = ['fair', 'light', 'medium', 'tan', 'deep'] as const;
export const UNDERTONES = ['cool', 'warm', 'neutral'] as const;

export const ALLERGY_LABELS: Record<(typeof ALLERGY_OPTIONS)[number], string> = {
  nickel: 'Nickel',
  zinc: 'Zinc',
  cobalt: 'Cobalt',
};

export const RING_HANDS: readonly RingHand[] = ['left', 'right'];
export const RING_FINGER_NAMES: readonly RingFingerName[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
];

export const RING_FINGERS: readonly RingFinger[] = RING_HANDS.flatMap((hand) =>
  RING_FINGER_NAMES.map((finger) => `${hand}-${finger}` as RingFinger),
);

/** US ring sizes 4 to 13 in half steps, as stored and as shown on products. */
export const US_RING_SIZES: readonly string[] = Array.from(
  {length: 19},
  (_, index) => String(4 + index * 0.5),
);

export const RING_HAND_LABELS: Record<RingHand, string> = {
  left: 'Left hand',
  right: 'Right hand',
};

export function ringFingerLabel(finger: RingFinger): string {
  const name = finger.split('-')[1];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** The finger id (`thumb`, `index`…) of a hand-finger key; translate it in the UI. */
export function ringFingerOf(finger: RingFinger): RingFingerName {
  return finger.split('-')[1] as RingFingerName;
}

export function ringHandOf(finger: RingFinger): RingHand {
  return finger.split('-')[0] as RingHand;
}

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

/** Keeps only known fingers that have a valid US size. Sizes are trimmed. */
function ringSizesRecord(
  value: unknown,
): Partial<Record<RingFinger, string>> | undefined {
  if (!isRecord(value)) return undefined;

  const sizes: Partial<Record<RingFinger, string>> = {};

  for (const finger of RING_FINGERS) {
    const raw: unknown = value[finger];
    const size = allowedValue(
      typeof raw === 'string' ? raw.trim() : undefined,
      US_RING_SIZES,
    );
    if (size) sizes[finger] = size;
  }

  return sizes;
}

/**
 * Parses a request payload. Only keys present in the input are returned, so a
 * partial save never overwrites fields it did not send.
 */
export function normalizePreferencesPatch(
  input: unknown,
): Partial<PreferenceProfile> {
  const source = isRecord(input) ? input : {};
  const patch: Partial<PreferenceProfile> = {};

  if (Array.isArray(source.allergies)) {
    patch.allergies = Array.from(
      new Set(
        source.allergies.filter(
          (value): value is (typeof ALLERGY_OPTIONS)[number] =>
            allowedValue(value, ALLERGY_OPTIONS) !== undefined,
        ),
      ),
    );
  }

  if (isRecord(source.skin)) {
    const skin: Skin = {};
    const tone = allowedValue(source.skin.tone, SKIN_TONES);
    const undertone = allowedValue(source.skin.undertone, UNDERTONES);

    if (tone) skin.tone = tone;
    if (undertone) skin.undertone = undertone;
    patch.skin = skin;
  }

  const ringSizes = ringSizesRecord(source.ringSizes);
  const preferredMaterials = stringArray(source.preferredMaterials);
  const preferredColors = stringArray(source.preferredColors);
  const preferredGemstones = stringArray(source.preferredGemstones);

  if (ringSizes !== undefined) patch.ringSizes = ringSizes;
  if (preferredMaterials !== undefined) {
    patch.preferredMaterials = preferredMaterials;
  }
  if (preferredColors !== undefined) {
    patch.preferredColors = preferredColors;
  }
  if (preferredGemstones !== undefined) {
    patch.preferredGemstones = preferredGemstones;
  }

  return patch;
}

export function normalizePreferences(input: unknown): PreferenceProfile {
  return {allergies: [], skin: {}, ...normalizePreferencesPatch(input)};
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
