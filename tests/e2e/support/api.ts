import type {APIResponse, PlaywrightWorkerArgs} from '@playwright/test';

export type ApiResult = {
  status: number;
  json: unknown;
  headers: ReturnType<APIResponse['headers']>;
};

/**
 * POSTs JSON to an `api.*` route from its own request context.
 *
 * Rejected POSTs (401/403) are answered before their body is read. The local
 * MiniOxygen preview server then resets the next request on that keep-alive
 * connection (ECONNRESET; curl shows the same), and a `Connection: close`
 * request header did not stop Playwright from reusing it. A fresh context per
 * POST means no connection is shared.
 */
export async function postJson(
  playwright: PlaywrightWorkerArgs['playwright'],
  baseURL: string | undefined,
  path: string,
  data: unknown,
  headers: Record<string, string> = {},
): Promise<ApiResult> {
  const context = await playwright.request.newContext({baseURL});
  try {
    const response = await context.post(path, {data, headers});
    return {
      status: response.status(),
      json: await response.json(),
      headers: response.headers(),
    };
  } finally {
    await context.dispose();
  }
}
