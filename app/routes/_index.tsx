import {Link, useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/_index';
import {ProductItem} from '~/components/product/ProductItem';
import {RecommendedProducts} from '~/components/product/RecommendedProducts';
import {useTranslation} from '~/lib/i18n';
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
  const result = await context.storefront.query(HOME_QUERY);

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
  const t = useTranslation();

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
      <section className="grid bg-secondary tablet:min-h-[min(620px,calc(100svh-90px))] tablet:grid-cols-[43%_57%]">
        <div className="order-2 flex flex-col items-start justify-center px-[5vw] py-16 tablet:order-1 tablet:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            {t('home.eyebrow')}
          </p>

          <h1 className="mt-6 max-w-[8ch] font-display text-[clamp(2.75rem,5vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.05em] text-ink">
            {t('home.titleStart')}{' '}
            <em className="text-primary">{t('home.titleEmphasis')}</em>
          </h1>

          <p className="mt-8 max-w-[38ch] text-base leading-7 text-primary">
            {t('home.intro')}
          </p>

          <Link
            to={heroUrl}
            prefetch="intent"
            className="mt-9 inline-flex min-h-[50px] items-center justify-between gap-10 bg-primary px-6 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-ink"
          >
            {t('home.exploreCollection')}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <Link
          to={heroUrl}
          prefetch="intent"
          aria-label={
            hero
              ? t('home.exploreTitle', {title: hero.title})
              : t('home.exploreAll')
          }
          className="group relative order-1 block min-h-[48svh] overflow-hidden bg-primary/10 tablet:order-2"
        >
          {heroImage ? (
            <Image
              data={heroImage}
              alt={
                heroImage.altText ||
                hero?.title ||
                t('home.heroAlt')
              }
              loading="eager"
              sizes="(min-width: 800px) 57vw, 100vw"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.035]"
            />
          ) : null}

          <div className="absolute bottom-6 left-6 max-w-[80%] bg-paper/90 px-6 py-5 text-primary backdrop-blur-md">
            <p className="text-xs uppercase tracking-widest">
              {t('home.edit')}
            </p>

            <p className="mt-2 font-display text-2xl">
              {hero?.title || t('home.editFallback')}
            </p>
          </div>
        </Link>
      </section>

      <div className="flex min-h-14 flex-wrap items-center justify-around gap-4 bg-primary px-6 py-4 text-xs uppercase tracking-[0.18em] text-white">
        <span>{t('home.madeToLayer')}</span>
        <span aria-hidden="true">✦</span>
        <span>{t('home.everydayFavorites')}</span>
        <span aria-hidden="true">✦</span>
        <span>{t('home.uniquelyYours')}</span>
      </div>

      <section
        className="px-[5vw] py-14 tablet:py-20"
        aria-labelledby="featured-heading"
      >
        <div className="mb-12 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              {t('home.selection')}
            </p>

            <h2
              id="featured-heading"
              className="mt-4 font-display text-[clamp(1.875rem,3vw,2.75rem)] leading-none tracking-tight"
            >
              {t('home.coveted')}
            </h2>
          </div>

          <Link
            to={featuredUrl}
            className="hidden min-h-11 items-center border-b border-ink text-xs uppercase tracking-widest sm:inline-flex"
          >
            {t('home.viewAll')}
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
              {t('home.emptyTitle')}
            </h3>

            <p className="mt-3 text-sm text-primary">
              {t('home.emptyText')}
            </p>
          </div>
        )}

        <Link
          to={featuredUrl}
          className="mt-10 inline-flex min-h-11 items-center border-b border-ink text-xs uppercase tracking-widest sm:hidden"
        >
          {t('home.viewAll')}
        </Link>
      </section>

      <RecommendedProducts className="px-[5vw] py-14 tablet:py-20" />

      <section className="grid bg-primary text-white tablet:grid-cols-[52%_48%]">
        <div className="relative min-h-[50svh] bg-secondary">
          {storyImage ? (
            <Image
              data={storyImage}
              alt={
                storyImage.altText ||
                story?.title ||
                t('home.storyAlt')
              }
              loading="lazy"
              sizes="(min-width: 800px) 52vw, 100vw"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex flex-col items-start justify-center px-[5vw] py-12 tablet:py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            {t('home.makeItYours')}
          </p>

          <h2 className="mt-6 max-w-[9ch] font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-none tracking-tight">
            {t('home.oneOfOne')}
          </h2>

          <p className="mt-7 max-w-[36ch] text-base leading-7 text-white/85">
            {story?.description ||
              t('home.storyText')}
          </p>

          <Link
            to={storyUrl}
            prefetch="intent"
            className="mt-9 inline-flex min-h-[50px] items-center justify-between gap-10 bg-paper px-6 text-xs font-medium uppercase tracking-widest text-primary transition-colors hover:bg-secondary"
          >
            {t('home.discoverCollection')}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      {collections.length ? (
        <section
          className="px-[5vw] py-14 tablet:py-20"
          aria-labelledby="collections-heading"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            {t('catalog.nextFavorite')}
          </p>

          <h2
            id="collections-heading"
            className="mt-4 font-display text-[clamp(1.875rem,3vw,2.75rem)] leading-none tracking-tight"
          >
            {t('home.exploreCollections')}
          </h2>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4 lg:grid-cols-4 xl:grid-cols-5">
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
          [t('home.detailsTitle'), t('home.detailsText')],
          [t('home.madeToLayer'), t('home.layerText')],
          [t('common.yourSelection'), t('home.selectionText')],
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