import {Suspense} from 'react';
import {Await, Link, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/product/ProductPrice';
import {ProductForm} from '~/components/product/ProductForm';
import {ProductGallery} from '~/components/product/ProductGallery';
import {ProductItem} from '~/components/product/ProductItem';
import {AllergenBadge} from '~/components/product/AllergenBadge';
import {FavoriteButton} from '~/components/product/FavoriteButton';
import {FittingRoomButton} from '~/components/product/FittingRoomButton';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {JEWELIETTE_PRODUCT_CARD_FRAGMENT, formatMetafieldValue} from '~/lib/jeweliette-catalog';
import {isRingProduct} from '~/lib/profile/ringCategory';

export const meta: Route.MetaFunction = ({data}) => [
  {title: `${data?.product.title ?? 'Product'} | Jeweliette`},
  {name: 'description', content: data?.product.seo.description ?? data?.product.description ?? ''},
  {rel: 'canonical', href: `/products/${data?.product.handle}`},
];

export async function loader(args: Route.LoaderArgs) {
  const {product} = await loadCriticalData(args);

  const recommendations = args.context.storefront
    .query(RECOMMENDATIONS_QUERY, {
      variables: {productId: product.id, language: 'EN'},
    })
    .then((result) => result.productRecommendations ?? [])
    .catch(() => []);

  return {product, recommendations};
}

async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  if (!handle) throw new Error('Expected product handle to be defined');

  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {
      handle,
      language: 'EN',
      selectedOptions: getSelectedProductOptions(request),
    },
  });

  if (!product?.id) throw new Response(null, {status: 404});

  redirectIfHandleIsLocalized(request, {handle, data: product});
  return {product};
}

export default function Product() {
  const {product, recommendations} = useLoaderData<typeof loader>();

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const collection = product.collections.nodes[0];

  const productDetails = [
    {label: 'Type', value: product.productType},
    {label: 'Material', value: product.material?.value},
    {label: 'Metal', value: product.metal?.value},
    {label: 'Gemstone', value: product.gemstone?.value},
    {label: 'Gem color', value: product.gemColor?.value},
  ]
    .map((item) => ({
      ...item,
      value: formatMetafieldValue(item.value),
    }))
    .filter((item) => item.value !== '');

  return (
    <div className="mx-auto max-w-[1280px] px-[4vw] pb-20 pt-6">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest text-primary"
      >
        <Link to="/" className="hover:text-ink">Home</Link>
        {collection ? (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/collections/${collection.handle}`} className="hover:text-ink">
              {collection.title}
            </Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span className="text-ink" aria-current="page">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
        <ProductGallery
          images={product.images.nodes}
          variantImage={selectedVariant?.image}
          title={product.title}
        />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <AllergenBadge allergens={product.allergens} className="mb-3" />

          {product.material?.value ? (
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
              {formatMetafieldValue(product.material.value)}
            </p>
          ) : null}

          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-tight">
              {product.title}
            </h1>
            <div className="flex items-center gap-2">
              <FavoriteButton productId={product.id} title={product.title} />
              <FittingRoomButton productId={product.id} title={product.title} />
            </div>
          </div>

          <div className="mt-3 text-lg">
            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
            />
          </div>

          <div className="mt-8">
            <ProductForm
              allergens={product.allergens}
              productOptions={productOptions}
              selectedVariant={selectedVariant}
              isRing={isRingProduct(product)}
            />
          </div>

          <div className="mt-10 divide-y divide-line border-y border-line text-sm">
            <details open className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-widest [&::-webkit-details-marker]:hidden">
                Description
                <span aria-hidden="true" className="group-open:hidden">+</span>
                <span aria-hidden="true" className="hidden group-open:inline">−</span>
              </summary>
              <div
                className="prose-sm mt-4 leading-7 text-primary [&_p]:mb-3"
                dangerouslySetInnerHTML={{__html: product.descriptionHtml}}
              />
            </details>

            {productDetails.length > 0 ? (
              <details className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-widest [&::-webkit-details-marker]:hidden">
                  Details
                  <span aria-hidden="true" className="group-open:hidden">
                    +
                  </span>
                  <span aria-hidden="true" className="hidden group-open:inline">
                    −
                  </span>
                </summary>

                <dl className="mt-5 space-y-3 text-sm">
                  {productDetails.map(({label, value}) => (
                    <div key={label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4">
                      <dt className="text-primary">{label}</dt>
                      <dd className="break-words text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ) : null}

            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-widest [&::-webkit-details-marker]:hidden">
                Shipping
                <span aria-hidden="true" className="group-open:hidden">+</span>
                <span aria-hidden="true" className="hidden group-open:inline">−</span>
              </summary>
              <p className="mt-4 leading-7 text-primary">
                Shipping options and taxes are calculated at checkout.
              </p>
            </details>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <Await resolve={recommendations}>
          {(items) =>
            items.length ? (
              <section className="mt-20" aria-labelledby="related-heading">
                <h2 id="related-heading" className="font-display text-2xl">
                  You may also like
                </h2>
                <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
                  {items.slice(0, 4).map((item) => (
                    <ProductItem key={item.id} product={item} />
                  ))}
                </div>
              </section>
            ) : null
          }
        </Await>
      </Suspense>

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice { amount currencyCode }
    id
    image { __typename id url altText width height }
    price { amount currencyCode }
    product { title handle }
    selectedOptions { name value }
    sku
    title
    unitPrice { amount currencyCode }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    productType
    material: metafield(namespace: "custom", key: "material") { value }
    metal: metafield(namespace: "custom", key: "metal") { value }
    gemstone: metafield(namespace: "custom", key: "gemstone") { value }
    gemColor: metafield(namespace: "custom", key: "gem_color") { value }
    allergens: metafield(namespace: "custom", key: "allergens") { value }
    images(first: 10) { nodes { id url altText width height } }
    collections(first: 1) { nodes { title handle } }
    category { id name }
    options {
      name
      optionValues {
        name
        firstSelectableVariant { ...ProductVariant }
        swatch { color image { previewImage { url } } }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants(selectedOptions: $selectedOptions) { ...ProductVariant }
    seo { description title }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) { ...Product }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const RECOMMENDATIONS_QUERY = `#graphql
  ${JEWELIETTE_PRODUCT_CARD_FRAGMENT}
  query JewelietteRecommendations(
    $productId: ID!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId) {
      ...JewelietteProductCard
    }
  }
` as const;
