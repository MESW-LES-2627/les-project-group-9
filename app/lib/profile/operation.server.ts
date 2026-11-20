import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import {isProductGid, type GidValidator} from './list-schema';
import type {ListOperation} from './types';

export const NO_STORE = {
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
} as const;

type Context = Pick<HydrogenRouterContextProvider, 'customerAccount'>;

export type ListOperationResult =
  {operation: ListOperation} | {error: string; status: number};

/**
 * Shared request parsing for the profile list endpoints (favorites, fitting
 * room): method check, login check, JSON parsing and GID validation. The
 * endpoint decides whether it stores product or variant GIDs.
 */
export async function readListOperation(
  request: Request,
  context: Context,
  emptyMessage: string,
  isValidId: GidValidator = isProductGid,
): Promise<ListOperationResult> {
  if (request.method !== 'POST') {
    return {error: 'Method not allowed', status: 405};
  }

  const loggedIn = await context.customerAccount.isLoggedIn();
  if (!loggedIn) {
    return {error: 'Unauthorized', status: 401};
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {error: 'Invalid JSON', status: 400};
  }

  const source = (payload ?? {}) as Record<string, unknown>;
  const validIds = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter(isValidId).slice(0, 500) : [];

  const operation: ListOperation = {};
  if (Array.isArray(source.add)) operation.add = validIds(source.add);
  if (Array.isArray(source.remove)) operation.remove = validIds(source.remove);

  if (operation.add === undefined && operation.remove === undefined) {
    return {error: emptyMessage, status: 400};
  }

  return {operation};
}
