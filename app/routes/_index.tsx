import {Link, useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/_index';
import {ProductItem} from '~/components/ProductItem';
import {
  JEWELIETTE_PRODUCT_CARD_FRAGMENT,
} from '~/lib/jeweliette-catalog';

export const meta: Route.MetaFunction = () => [
  {
    title: 'Jeweliette | Wear your story',
  },
  {
    name: 'description',
    content:
      'Explore the Jeweliette collection. Find pieces to wear, layer and make your own.',
  },
];

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(HOME_QUERY, {
    variables: {
      language: 'EN',
    },
  });

  function findCollection(name: string) {
    const resource = result.contentMenu?.items.find(
      (item) =>
        item.title.trim().toLowerCase() === name.toLowerCase(),
    )?.resource;

    return resource?.__typename === 'Collection'
      ? resource
      : null;
  }

  const hero = findCollection('Hero');
  const featured = findCollection('Featured');
  const story = findCollection('Story');

  return {
    hero,
    story,
    featuredProducts: featured
      ? featured.products.nodes
      : result.products.nodes,
    featuredUrl: featured
      ? `/collections/${featured.handle}`
      : '/collections/all',
    fallbackProducts: result.products.nodes,
    collections: result.collections.nodes,
  };
}

export default function Homepage() {
  const {
    hero,
    story,
    featuredProducts,
    featuredUrl,
    fallbackProducts,
    collections,
  } = useLoaderData<typeof loader>();

  const heroUrl = hero
    ? `/collections/${hero.handle}`
    : '/collections/all';

  const heroImage =
    hero?.image ??
    hero?.products.nodes[0]?.featuredImage ??
    fallbackProducts[0]?.featuredImage;

  const storyUrl = story
    ? `/collections/${story.handle}`
    : '/collections/all';

  const storyImage =
    story?.image ??
    story?.products.nodes[0]?.featuredImage ??
    fallbackProducts[1]?.featuredImage ??
    heroImage;

  return (
    <div className="overflow-hidden">
      <section className="grid bg-secondary tablet:min-h-[calc(100svh-90px)] tablet:grid-cols-[43%_57%]">
        <div className="order-2 flex flex-col items-start justify-center px-[5vw] py-16 tablet:order-1 tablet:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            The new heirlooms
          </p>

          <h1 className="mt-6 max-w-[8ch] font-display text-[clamp(3.8rem,7.3vw,7rem)] font-medium leading-[0.9] tracking-[-0.05em] text-ink">
            Wear your <em className="text-primary">story.</em>
          </h1>

          <p className="mt-8 max-w-[38ch] text-base leading-7 text-primary">
            Find the pieces that feel like you. Discover new
            favorites, create your everyday layers and make
            every detail your own.
          </p>

          <Link
            to={heroUrl}
            prefetch="intent"
            className="mt-9 inline-flex min-h-[50px] items-center justify-between gap-10 bg-primary px-6 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-ink"
          >
            Explore the collection
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <Link
          to={heroUrl}
          prefetch="intent"
          aria-label={
            hero
              ? `Explore ${hero.title}`
              : 'Explore all pieces'
          }
          className="group relative order-1 block min-h-[62svh] overflow-hidden bg-primary/10 tablet:order-2"
        >
          {heroImage ? (
            <Image
              data={heroImage}
              alt={
                heroImage.altText ||
                hero?.title ||
                'Explore the Jeweliette collection'
              }
              loading="eager"
              sizes="(min-width: 800px) 57vw, 100vw"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.035]"
            />
          ) : null}

          <div className="absolute bottom-6 left-6 max-w-[80%] bg-paper/90 px-6 py-5 text-primary backdrop-blur-md">
            <p className="text-xs uppercase tracking-widest">
              The Jeweliette edit
            </p>

            <p className="mt-2 font-display text-2xl">
              {hero?.title || 'Quietly unforgettable'}
            </p>
          </div>
        </Link>
      </section>

      <div className="flex min-h-14 flex-wrap items-center justify-around gap-4 bg-primary px-6 py-4 text-xs uppercase tracking-[0.18em] text-white">
        <span>Made to layer</span>
        <span aria-hidden="true">✦</span>
        <span>Your everyday favorites</span>
        <span aria-hidden="true">✦</span>
        <span>Uniquely yours</span>
      </div>

      <section
        className="px-[5vw] py-20 tablet:py-28"
        aria-labelledby="featured-heading"
      >
        <div className="mb-12 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              The Jeweliette selection
            </p>

            <h2
              id="featured-heading"
              className="mt-4 font-display text-[clamp(2.5rem,4vw,4rem)] leading-none tracking-tight"
            >
              Currently coveted
            </h2>
          </div>

          <Link
            to={featuredUrl}
            className="hidden min-h-11 items-center border-b border-ink text-xs uppercase tracking-widest sm:inline-flex"
          >
            View all pieces
          </Link>
        </div>

        {featuredProducts.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {featuredProducts.map((product, index) => (
              <div
                key={product.id}
                className={
                  index % 2 === 1
                    ? 'pt-6 tablet:pt-10'
                    : ''
                }
              >
                <ProductItem product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="border-y border-line py-12">
            <h3 className="font-display text-2xl">
              New favorites are on their way.
            </h3>

            <p className="mt-3 text-sm text-primary">
              Explore the available collections below.
            </p>
          </div>
        )}

        <Link
          to={featuredUrl}
          className="mt-10 inline-flex min-h-11 items-center border-b border-ink text-xs uppercase tracking-widest sm:hidden"
        >
          View all pieces
        </Link>
      </section>

      <section className="grid bg-primary text-white tablet:grid-cols-[52%_48%]">
        <div className="relative min-h-[50svh] bg-secondary">
          {storyImage ? (
            <Image
              data={storyImage}
              alt={
                storyImage.altText ||
                story?.title ||
                'Details from the Jeweliette collection'
              }
              loading="lazy"
              sizes="(min-width: 800px) 52vw, 100vw"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex flex-col items-start justify-center px-[5vw] py-16 tablet:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Make it yours
          </p>

          <h2 className="mt-6 max-w-[9ch] font-display text-[clamp(3rem,5.5vw,5.125rem)] leading-none tracking-tight">
            One of one, just like you.
          </h2>

          <p className="mt-7 max-w-[36ch] text-base leading-7 text-white/85">
            {story?.description ||
              'Start with a piece you love. Add the details that make it yours.'}
          </p>

          <Link
            to={storyUrl}
            prefetch="intent"
            className="mt-9 inline-flex min-h-[50px] items-center justify-between gap-10 bg-paper px-6 text-xs font-medium uppercase tracking-widest text-primary transition-colors hover:bg-secondary"
          >
            Discover the collection
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      {collections.length ? (
        <section
          className="px-[5vw] py-20 tablet:py-28"
          aria-labelledby="collections-heading"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            Find your next favorite
          </p>

          <h2
            id="collections-heading"
            className="mt-4 font-display text-[clamp(2.5rem,4vw,4rem)] leading-none tracking-tight"
          >
            Explore the collections
          </h2>

          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {collections.map((collection) => {
              const image =
                collection.image ??
                collection.products.nodes[0]?.featuredImage;

              return (
                <Link
                  key={collection.id}
                  to={`/collections/${collection.handle}`}
                  prefetch="intent"
                  className="group block"
                >
                  <div className="aspect-[0.9] overflow-hidden bg-secondary">
                    {image ? (
                      <Image
                        data={image}
                        alt={image.altText || collection.title}
                        loading="lazy"
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center font-display text-xl text-primary">
                        {collection.title}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <h3 className="font-display text-xl">
                      {collection.title}
                    </h3>
                    <span aria-hidden="true">↗</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="grid border-t border-line bg-paper px-[5vw] py-12 tablet:grid-cols-3 tablet:py-16">
        {[
          [
            'Considered details',
            'Explore the materials and finishes listed on each product page.',
          ],
          [
            'Made to layer',
            'Find pieces to wear together, or a new favorite to wear on its own.',
          ],
          [
            'Your selection',
            'Choose your options before adding a piece to your shopping bag.',
          ],
        ].map(([title, text], index) => (
          <article
            key={title}
            className={`py-7 tablet:px-8 ${
              index > 0
                ? 'border-t border-line tablet:border-l tablet:border-t-0'
                : ''
            }`}
          >
            <p className="text-xs tracking-widest text-primary">
              {String(index + 1).padStart(2, '0')}
            </p>

            <h2 className="mt-4 font-display text-2xl">
              {title}
            </h2>

            <p className="mt-3 text-sm leading-7 text-primary">
              {text}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}

const HOME_QUERY = `#graphql
  ${JEWELIETTE_PRODUCT_CARD_FRAGMENT}

  fragment JewelietteHomeCollection on Collection {
    id
    title
    handle
    description

    image {
      id
      url
      altText
      width
      height
    }

    products(first: 4) {
      nodes {
        ...JewelietteProductCard
      }
    }
  }

  query JewelietteHome(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    contentMenu: menu(handle: "home-content") {
      items {
        title

        resource {
          __typename

          ... on Collection {
            ...JewelietteHomeCollection
          }
        }
      }
    }

    collections(first: 8, sortKey: TITLE) {
      nodes {
        ...JewelietteHomeCollection
      }
    }

    products(first: 4, sortKey: BEST_SELLING) {
      nodes {
        ...JewelietteProductCard
      }
    }
  }
` as const;