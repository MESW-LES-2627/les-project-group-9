import {ProductIdList} from './profile-field';
import type {CustomerProfile, FavoriteOperation} from './types';

export {isProductGid, uniqueProductIds} from './list-schema';

export const MAX_FAVORITES = 500;

export class FavoritesList extends ProductIdList {
  readonly key = 'favorites';
  readonly max = MAX_FAVORITES;

  protected current(profile: CustomerProfile): string[] {
    return profile.favorites;
  }
}

export const favoritesList = new FavoritesList();

export function parseFavorites(
  raw: string | null | undefined,
): string[] {
  return favoritesList.parse(raw);
}

export function serializeFavorites(ids: string[]): string {
  return favoritesList.serialize(ids);
}

export function applyFavoriteOperation(
  current: string[],
  operation: FavoriteOperation,
): string[] {
  return favoritesList.apply(current, operation);
}
