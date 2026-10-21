import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {MockShopNotice} from '~/components/MockShopNotice';
import {Icon} from '~/components/Icon';

export const meta: Route.MetaFunction = () => [
  {title: 'Jeweliette | Joias para contar a tua história'},
  {
    name: 'description',
    content: 'Joias modernas criadas para combinar, oferecer e guardar.',
  },
];

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const {collections} = await context.storefront.query(
    FEATURED_COLLECTION_QUERY,
  );

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featuredCollection: collections.nodes[0],
  };
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {recommendedProducts};
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="overflow-hidden">
      {data.isShopLinked ? null : <MockShopNotice />}
      <Hero collection={data.featuredCollection} />
      <Marquee />
      <RecommendedProducts products={data.recommendedProducts} />
      <StoryBanner collection={data.featuredCollection} />
      <Services />
    </div>
  );
}

function Hero({collection}: {collection: FeaturedCollectionFragment}) {
  if (!collection) return null;
  const image = collection.image;

  return (
    <section className="grid min-h-[calc(100svh-90px)] bg-secondary tablet:grid-cols-[43%_57%]">
      <div className="order-2 flex flex-col items-start justify-center px-[7vw] py-16 tablet:order-1 tablet:px-[5vw] tablet:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          The new heirlooms · 2026
        </p>
        <h1 className="mt-6 max-w-[8ch] font-display text-[clamp(3.8rem,7.3vw,7rem)] font-medium leading-[0.88] tracking-[-0.05em] text-primary">
          Wear your <em className="font-medium">story.</em>
        </h1>
        <p className="mt-8 max-w-[38ch] text-base leading-7 text-primary/80">
          Joias modernas desenhadas para combinar, amar e guardar durante anos.
        </p>
        <Link
          className="mt-9 inline-flex min-h-[50px] items-center justify-between gap-8 bg-primary px-6 text-xs font-medium uppercase tracking-[0.13em] text-white hover:bg-ink"
          prefetch="intent"
          to={`/collections/${collection.handle}`}
        >
          Explorar coleção <Icon name="arrow" size={17} />
        </Link>
      </div>

      <Link
        aria-label={`Explorar ${collection.title}`}
        className="group relative order-1 min-h-[62svh] overflow-hidden bg-primary/10 tablet:order-2 tablet:min-h-full"
        prefetch="intent"
        to={`/collections/${collection.handle}`}
      >
        {image ? (
          <Image
            alt={image.altText || collection.title}
            className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.035]"
            data={image}
            loading="eager"
            sizes="(min-width: 800px) 57vw, 100vw"
          />
        ) : null}
        <div className="absolute bottom-6 left-5 bg-paper/85 px-5 py-4 text-primary backdrop-blur-md sm:bottom-8 sm:left-8">
          <p className="text-xs uppercase tracking-[0.16em]">Coleção em destaque</p>
          <p className="mt-1 font-display text-xl">{collection.title}</p>
        </div>
      </Link>
    </section>
  );
}

function Marquee() {
  return (
    <div
      aria-label="Valores Jeweliette"
      className="flex min-h-14 min-w-max items-center justify-around gap-12 bg-primary px-8 text-xs font-medium uppercase tracking-[0.18em] text-white sm:min-w-0"
    >
      <span>Made to layer</span>
      <Icon name="sparkle" size={14} />
      <span>Designed to last</span>
      <Icon name="sparkle" size={14} />
      <span>Uniquely yours</span>
    </div>
  );
}

function RecommendedProducts({
                               products,
                             }: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <section className="px-[5vw] py-20 sm:py-28" aria-labelledby="currently-coveted">
      <div className="mb-12 flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Curadoria Jeweliette
          </p>
          <h2
            className="mt-3 font-display text-[clamp(2.5rem,4vw,4rem)] font-medium leading-none tracking-[-0.035em]"
            id="currently-coveted"
          >
            Currently coveted
          </h2>
        </div>
        <Link
          className="hidden min-h-11 items-center border-b border-ink text-xs font-medium uppercase tracking-[0.13em] sm:inline-flex"
          to="/collections/all"
        >
          Ver todas as peças
        </Link>
      </div>

      <Suspense fallback={<ProductGridSkeleton />}>
        <Await resolve={products}>
          {(response) => (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
              {response?.products.nodes.map((product, index) => (
                <div
                  className={index % 2 === 1 ? 'translate-y-6 sm:translate-y-10' : ''}
                  key={product.id}
                >
                  <ProductItem product={product} />
                </div>
              ))}
            </div>
          )}
        </Await>
      </Suspense>

      <Link
        className="mt-14 inline-flex min-h-11 items-center border-b border-ink text-xs font-medium uppercase tracking-[0.13em] sm:hidden"
        to="/collections/all"
      >
        Ver todas as peças
      </Link>
    </section>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div className="animate-pulse" key={item}>
          <div className="aspect-[0.82] bg-secondary/70" />
          <div className="mt-4 h-4 w-3/4 bg-secondary/70" />
          <div className="mt-2 h-3 w-1/3 bg-secondary/40" />
        </div>
      ))}
    </div>
  );
}

function StoryBanner({collection}: {collection: FeaturedCollectionFragment}) {
  const image = collection?.image;

  return (
    <section className="grid bg-primary text-white tablet:grid-cols-[52%_48%]">
      <div className="min-h-[50svh] overflow-hidden bg-secondary">
        {image ? (
          <Image
            alt="Detalhe editorial de joalharia Jeweliette"
            className="h-full w-full object-cover"
            data={image}
            loading="lazy"
            sizes="(min-width: 800px) 52vw, 100vw"
          />
        ) : null}
      </div>
      <div className="flex flex-col items-start justify-center px-[7vw] py-16 tablet:px-[5vw] tablet:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-secondary">
          Make it yours
        </p>
        <h2 className="mt-5 max-w-[8ch] font-display text-[clamp(3rem,5.5vw,5.125rem)] font-medium leading-none tracking-[-0.035em]">
          One of one, just like you.
        </h2>
        <Link
          className="mt-9 inline-flex min-h-[50px] items-center justify-between gap-8 bg-paper px-6 text-xs font-medium uppercase tracking-[0.13em] text-primary hover:bg-secondary"
          to="/collections/custom"
        >
          Começar a personalizar <Icon name="arrow" size={17} />
        </Link>
      </div>
    </section>
  );
}

function Services() {
  const services = [
    ['Considered craft', 'Materiais escolhidos com cuidado e acabamentos pensados para durar.'],
    ['The fitting room', 'Guarda e compara as peças que queres combinar antes de comprar.'],
    ['Made personal', 'Escolhe peças e detalhes que refletem a tua forma de usar joias.'],
  ];

  return (
    <section className="grid bg-paper px-[5vw] py-16 tablet:grid-cols-3 tablet:py-20">
      {services.map(([title, body], index) => (
        <article
          className={`py-8 tablet:px-10 tablet:py-2 ${index > 0 ? 'border-t border-line tablet:border-l tablet:border-t-0' : ''}`}
          key={title}
        >
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h2 className="mt-4 font-display text-2xl font-medium">{title}</h2>
          <p className="mt-3 max-w-[36ch] text-sm leading-7 text-primary/75">{body}</p>
        </article>
      ))}
    </section>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
