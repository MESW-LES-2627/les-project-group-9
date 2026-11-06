import {
  applyProductIdOperation,
  parseProductIdList,
  serializeProductIdList,
} from './list-schema';
import type {FavoriteOperation} from './types';

export {isProductGid, uniqueProductIds} from './list-schema';

export const MAX_FAVORITES = 500;

export function parseFavorites(
  raw: string | null | undefined,
): string[] {
  return parseProductIdList(raw, MAX_FAVORITES);
}

export function serializeFavorites(ids: string[]): string {
  return serializeProductIdList(ids, MAX_FAVORITES);
}

export function applyFavoriteOperation(
  current: string[],
  operation: FavoriteOperation,
): string[] {
  return applyProductIdOperation(current, operation, MAX_FAVORITES);
}
