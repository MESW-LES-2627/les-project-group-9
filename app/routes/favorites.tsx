import {useEffect} from 'react';
import {Link, useFetcher} from 'react-router';
import type {Route} from './+types/favorites';
import {ProductItem} from '~/components/ProductItem';
import {RecommendedProducts} from '~/components/RecommendedProducts';
import {useFavorites} from '~/lib/favorites';
import {JEWELIETTE_PRODUCT_CARD_FRAGMENT} from '~/lib/jeweliette-catalog';

export const meta: Route.MetaFunction = () => [
  {title: 'Favorites | Jeweliette'},
  {name: 'robots', content: 'noindex'},
];

export async function loader({request, context}: Route.LoaderArgs) {
  const raw = new URL(request.url).searchParams.get('ids') ?? '';
  const ids = raw
    .split(',')
    .filter((id) => id.startsWith('gid://shopify/Product/'))
    .slice(0, 50);

  if (!ids.length) return {products: []};

  const {nodes} = await context.storefront.query(FAVORITES_QUERY, {
    variables: {ids, language: 'EN'},
  });

  return {
    products: nodes.flatMap((node) =>
      node && node.__typename === 'Product' ? [node] : [],
    ),
  };
}

export default function Favorites() {
  const {ids, ready, isLoggedIn} = useFavorites();
  const fetcher = useFetcher<typeof loader>();
  const key = ids.join(',');

  useEffect(() => {
    if (key) {
      void fetcher.load(`/favorites?ids=${encodeURIComponent(key)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const products = (fetcher.data?.products ?? []).filter((p) => ids.includes(p.id));

  return (
    <section className="mx-auto max-w-[1400px] px-[4vw] pb-20 pt-10 tablet:pt-14">
      <header className="text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Your selection</p>
        <h1 className="mt-3 font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-none">
          Favorites
        </h1>
      </header>

      {!ready ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center text-sm text-primary">
          Loading favorites…
        </div>
      ) : !isLoggedIn ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center">
          <h2 className="font-display text-2xl">Log in to save favorites.</h2>
          <p className="mt-3 text-sm text-primary">
            Sign in to keep your favourite pieces across devices.
          </p>
          <Link
            to="/account/login"
            className="mt-6 inline-flex min-h-11 items-center bg-primary px-6 text-[11px] uppercase tracking-widest text-white hover:bg-ink"
          >
            Log in
          </Link>
        </div>
      ) : ids.length === 0 ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center">
          <h2 className="font-display text-2xl">Nothing saved yet.</h2>
          <p className="mt-3 text-sm text-primary">
            Tap the heart on any piece to keep it here.
          </p>
          <Link
            to="/collections/all"
            className="mt-6 inline-flex min-h-11 items-center bg-primary px-6 text-[11px] uppercase tracking-widest text-white hover:bg-ink"
          >
            Explore the collection
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductItem key={product.id} product={product} />
            ))}
          </div>
          <RecommendedProducts className="mt-16" />
        </>
      )}
    </section>
  );
}

const FAVORITES_QUERY = `#graphql
  ${JEWELIETTE_PRODUCT_CARD_FRAGMENT}
  query JewelietteFavorites(
    $ids: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      __typename
      ... on Product { ...JewelietteProductCard }
    }
  }
` as const;