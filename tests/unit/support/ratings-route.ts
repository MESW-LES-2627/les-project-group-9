/**
 * Helpers to call the US-058/US-059 JSON actions (`api.order-ratings`,
 * `api.rating-comments`) and the order page loader with the fakes in
 * `ratings-fakes.ts`.
 */
import type {ActionFunctionArgs} from 'react-router';
import {
  ADMIN_ENV,
  CUSTOMER_A,
  fakeCustomerAccount,
  type FakeCustomerAccountOptions,
  type OrderFixture,
} from './ratings-fakes';

export const ORIGIN = 'http://localhost';

export type RouteContext = ActionFunctionArgs['context'];

/** A route context for the signed-in `CUSTOMER_A` (unless overridden). */
export function contextFor(
  options: Partial<FakeCustomerAccountOptions> & {orders: OrderFixture[]},
  env: Record<string, string> = ADMIN_ENV,
) {
  const fake = fakeCustomerAccount({customerId: CUSTOMER_A, ...options});
  return {
    fake,
    context: {customerAccount: fake.customerAccount, env} as unknown as RouteContext,
  };
}

export type JsonRequestInit = {method?: string; headers?: Record<string, string>};

/** A same-origin JSON request (string bodies are sent as-is, e.g. broken JSON). */
export function jsonRequest(
  url: string,
  body: unknown,
  {method = 'POST', headers = {Origin: ORIGIN}}: JsonRequestInit = {},
) {
  return new Request(url, {
    method,
    headers: {'Content-Type': 'application/json', ...headers},
    body: method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

type JsonAction = (args: ActionFunctionArgs) => Promise<unknown>;

/** Runs a route action and unwraps its `data()` result. */
export async function callAction(action: JsonAction, request: Request, context: RouteContext) {
  const result = (await action({
    request,
    context,
    params: {},
  } as ActionFunctionArgs)) as {data: Record<string, unknown>; init: ResponseInit | null};
  return {
    status: result.init?.status ?? 200,
    body: result.data,
    headers: new Headers(result.init?.headers),
  };
}
