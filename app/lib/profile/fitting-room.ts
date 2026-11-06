import {
  applyProductIdOperation,
  parseProductIdList,
  serializeProductIdList,
} from './list-schema';
import type {ListOperation} from './types';

export const MAX_FITTING_ROOM = 50;

export function parseFittingRoom(raw: string | null | undefined): string[] {
  return parseProductIdList(raw, MAX_FITTING_ROOM);
}

export function serializeFittingRoom(ids: string[]): string {
  return serializeProductIdList(ids, MAX_FITTING_ROOM);
}

export function applyFittingRoomOperation(
  current: string[],
  operation: ListOperation,
): string[] {
  return applyProductIdOperation(current, operation, MAX_FITTING_ROOM);
}
