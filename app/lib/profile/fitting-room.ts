import {GidList} from './profile-field';
import {isVariantGid} from './list-schema';
import type {CustomerProfile, ListOperation} from './types';

import type {
  CatalogImage,
  CatalogMoney,
  CatalogProduct,
} from '../jeweliette-catalog';
import type {TryOnPiece} from '../try-on/catalog';

export const MAX_FITTING_ROOM = 50;

/** One wardrobe entry: a specific variant (colourway), not just the product. */
export type FittingRoomPiece = {
  variantId: string;
  product: CatalogProduct;
  image: CatalogImage | null;
  variantTitle: string;
  price: CatalogMoney;
  available: boolean;
  tryOn: TryOnPiece | null;
};

/**
 * The fitting room stores **variant** GIDs: each entry is one colourway, so a
 * clear and a pink variant can live side by side and try on their own overlay.
 */
export class FittingRoomList extends GidList {
  readonly key = 'fitting_room';
  readonly max = MAX_FITTING_ROOM;
  readonly isValidId = isVariantGid;

  protected current(profile: CustomerProfile): string[] {
    return profile.fittingRoom;
  }
}

export const fittingRoomList = new FittingRoomList();

export function parseFittingRoom(raw: string | null | undefined): string[] {
  return fittingRoomList.parse(raw);
}

export function serializeFittingRoom(ids: string[]): string {
  return fittingRoomList.serialize(ids);
}

export function applyFittingRoomOperation(
  current: string[],
  operation: ListOperation,
): string[] {
  return fittingRoomList.apply(current, operation);
}
