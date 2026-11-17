import {ProductIdList} from './profile-field';
import type {CustomerProfile, ListOperation} from './types';

export const MAX_FITTING_ROOM = 50;

export class FittingRoomList extends ProductIdList {
  readonly key = 'fitting_room';
  readonly max = MAX_FITTING_ROOM;

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
