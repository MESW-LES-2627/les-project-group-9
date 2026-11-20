import {createHydrogenContext, createWithCache} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {getLocaleFromRequest} from '~/lib/i18n';

/**
 * Request-scoped additions to the Hydrogen context, available as
 * `context.<name>` in loaders and actions.
 * - `withCache`: the worker cache for non-Storefront data, such as the public
 *   product reviews read from the Admin API (US-060).
 */
function createAdditionalContext(
  request: Request,
  cache: Cache,
  waitUntil: ExecutionContext['waitUntil'],
) {
  return {withCache: createWithCache({cache, waitUntil, request})};
}

// Automatically augment HydrogenAdditionalContext with the additional context type
type AdditionalContextType = ReturnType<typeof createAdditionalContext>;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}

  // Augment HydrogenCustomCartFragment with the codegen'd cart fragment type so
  // that context.cart.get() and all cart mutations return the extended cart type.
  interface HydrogenCustomCartFragment extends CartApiQueryFragment {}
}

/**
 * Creates Hydrogen context for React Router 7.9.x
 * Returns HydrogenRouterContextProvider with hybrid access patterns
 * */
export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  /**
   * Open a cache instance in the worker and a custom session instance.
   */
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      // Language from the `jeweliette_locale` cookie (see app/lib/i18n.ts).
      i18n: getLocaleFromRequest(request),
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    createAdditionalContext(request, cache, waitUntil),
  );

  return hydrogenContext;
}
