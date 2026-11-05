/**
 * Helpers for reading Storefront API metafield values.
 *
 * Metafields arrive as strings, so these normalize them into the slug format
 * used for matching (lowercase, accents removed, spaces/underscores -> dashes).
 */

export function normalizeValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

/** Comma-separated text metafield, e.g. `material: "gold plated, silver"`. */
export function parseTextMetafield(value?: string | null): string[] {
  if (!value) return [];
  return dedupe(value.split(',').map(normalizeValue).filter(Boolean));
}

/** List-of-single-line-text metafield, e.g. `gemstone: '["zirconia"]'`. */
export function parseListMetafield(value?: string | null): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return dedupe(
      parsed
        .filter((item): item is string => typeof item === 'string')
        .map(normalizeValue)
        .filter(Boolean),
    );
  } catch {
    return [];
  }
}
