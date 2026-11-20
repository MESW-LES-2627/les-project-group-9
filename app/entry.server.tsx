import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    // The try-on compiles MediaPipe's WebAssembly in the browser.
    // `'wasm-unsafe-eval'` is the scoped directive; `'unsafe-eval'` is the
    // fallback for iOS Safari before 16.4, which does not know the former.
    scriptSrc: [
      "'self'",
      "'wasm-unsafe-eval'",
      "'unsafe-eval'",
      'https://cdn.shopify.com',
      'https://shopify.com',
    ],
    // Brand fonts are loaded from Google Fonts (see root.tsx). Hydrogen merges
    // these with its defaults, so only the extra hosts are listed.
    styleSrc: ['https://fonts.googleapis.com'],
    fontSrc: ['https://fonts.gstatic.com', 'data:'],
    // MediaPipe compiles its WASM in a worker on some Safari versions.
    workerSrc: ["'self'", 'blob:'],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
