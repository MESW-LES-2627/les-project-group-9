import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/root';
import {useEffect} from 'react';
import logo from '~/assets/logo.svg';
import tailwindCss from '~/styles/tailwind.css?url';
import {PageLayout} from '~/components/layout/PageLayout';
import {ProfileProvider} from '~/lib/profile/ProfileProvider';
import {
  DEFAULT_APP_LOCALE,
  LocaleContext,
  toAppLocale,
  useTranslation,
} from '~/lib/i18n';

export type RootLoader = typeof loader;

export const shouldRevalidate: ShouldRevalidateFunction = ({
                                                             formMethod,
                                                             currentUrl,
                                                             nextUrl,
                                                           }) => {
  if (formMethod && formMethod !== 'GET') return true;
  if (currentUrl.toString() === nextUrl.toString()) return true;
  return false;
};

export function links() {
  return [
    {rel: 'preconnect', href: 'https://cdn.shopify.com'},
    {rel: 'preconnect', href: 'https://shop.app'},
    {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous'},
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap',
    },
    {rel: 'icon', type: 'image/svg+xml', href: logo},
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  const {storefront, env} = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    locale: toAppLocale(storefront.i18n),
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;
  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {headerMenuHandle: 'main-menu'},
    }),
  ]);
  return {header};
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront, customerAccount, cart} = context;
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {footerMenuHandle: 'footer'},
    })
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');
  const locale = data?.locale ?? DEFAULT_APP_LOCALE;

  return (
    <html lang={locale.tag}>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <Meta />
      <Links />
      <link rel="stylesheet" href={tailwindCss} />
    </head>
    <body>
    <LocaleContext.Provider value={locale}>
    {data ? (
      <Analytics.Provider cart={data.cart} shop={data.shop} consent={data.consent}>
        <ProfileProvider>
          <PageLayout {...data}>{children}</PageLayout>
        </ProfileProvider>
      </Analytics.Provider>
    ) : (
      children
    )}
    </LocaleContext.Provider>
    <ScrollRestoration nonce={nonce} />
    <Scripts nonce={nonce} />
    </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/**
 * Shows a translated message chosen by status. Raw server messages are logged,
 * not shown: they are English-only and may reveal internal details.
 */
export function ErrorBoundary() {
  const error = useRouteError();
  const t = useTranslation();
  const errorStatus = isRouteErrorResponse(error) ? error.status : 500;

  useEffect(() => {
    console.error(error);
  }, [error]);

  const title =
    errorStatus === 404 ? t('error.notFoundTitle') : t('error.title');
  const message =
    errorStatus === 404
      ? t('error.notFoundText')
      : errorStatus >= 400 && errorStatus < 500
        ? t('error.badRequestText')
        : t('error.unexpectedText');

  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-6 py-20 text-center">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{t('error.label', {status: errorStatus})}</p>
        <h1 className="mt-4 font-display text-5xl text-primary">{title}</h1>
        <p className="mx-auto mt-5 max-w-[55ch] text-sm leading-7 text-primary/75">{message}</p>
        <a className="mt-8 inline-flex min-h-11 items-center border-b border-ink text-xs font-medium uppercase tracking-[0.13em]" href="/">
          {t('error.backHome')}
        </a>
      </div>
    </main>
  );
}

const MENU_FRAGMENT = `#graphql
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
  fragment ChildMenuItem on MenuItem {
    ...MenuItem
  }
  fragment ParentMenuItem on MenuItem {
    ...MenuItem
    items {
      ...ChildMenuItem
    }
  }
  fragment Menu on Menu {
    id
    items {
      ...ParentMenuItem
    }
  }
` as const;

const HEADER_QUERY = `#graphql
  query Header(
    $country: CountryCode
    $headerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    shop {
      ...Shop
    }
    menu(handle: $headerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
  #graphql
  fragment Shop on Shop {
    id
    name
    description
    primaryDomain {
      url
    }
    brand {
      logo {
        image {
          url
        }
      }
    }
  }
` as const;

const FOOTER_QUERY = `#graphql
  query Footer(
    $country: CountryCode
    $footerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    menu(handle: $footerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
` as const;
