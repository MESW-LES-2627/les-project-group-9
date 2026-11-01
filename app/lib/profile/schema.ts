import type {FavoriteOperation} from './types';

export const MAX_FAVORITES = 500;

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;

export function isProductGid(value: unknown): value is string {
  return typeof value === 'string' && PRODUCT_GID.test(value);
}

export function uniqueProductIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of ids) {
    if (!isProductGid(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

export function parseFavorites(raw: string | null | undefined): string[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? uniqueProductIds(parsed as string[]).slice(0, MAX_FAVORITES)
      : [];
  } catch {
    return [];
  }
}

export function serializeFavorites(ids: string[]): string {
  return JSON.stringify(uniqueProductIds(ids).slice(0, MAX_FAVORITES));
}

export function applyFavoriteOperation(
  current: string[],
  operation: FavoriteOperation,
): string[] {
  let next = uniqueProductIds(current);

  if (operation.remove?.length) {
    const removed = new Set(operation.remove);
    next = next.filter((id) => !removed.has(id));
  }

  if (operation.add?.length) {
    const added = uniqueProductIds(operation.add).filter(
      (id) => !next.includes(id),
    );
    next = [...added, ...next];
  }

  return next.slice(0, MAX_FAVORITES);
}
