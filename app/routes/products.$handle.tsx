import {Suspense} from 'react';
import {Await, Link, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {translatorFromMatches, useTranslation} from '~/lib/i18n';
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
import {TryOnButton} from '~/components/product/TryOnButton';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {
  JEWELIETTE_MATERIAL_METAFIELD_FRAGMENT,
  JEWELIETTE_PRODUCT_CARD_FRAGMENT,
  formatMetafieldValue,
} from '~/lib/jeweliette-catalog';
import {materialsForColor, parseProductMaterials} from '~/lib/materials';
import {isColorOption} from '~/lib/options';
import {isRingProduct} from '~/lib/profile/ringCategory';
import {resolveTryOn} from '~/lib/try-on/catalog';
import {isMobileRequest} from '~/lib/try-on/device';
import {tryOnPageUrl} from '~/lib/try-on/url';

export const meta: Route.MetaFunction = ({data, matches}) => [
  {
    title: `${data?.product.title ?? translatorFromMatches(matches)('meta.productFallback')} | Jeweliette`,
  },
  {
    name: 'description',
    content: data?.product.seo.description ?? data?.product.description ?? '',
  },
  {rel: 'canonical', href: `/products/${data?.product.handle}`},
];

export async function loader(args: Route.LoaderArgs) {
  const {product} = await loadCriticalData(args);

  const recommendations = args.context.storefront
    .query(RECOMMENDATIONS_QUERY, {
      variables: {productId: product.id},
    })
    .then((result) => result.productRecommendations ?? [])
    .catch(() => []);

  return {
    product,
    recommendations,
    tryOn: resolveTryOn(product),
    tryOnLink: tryOnPageUrl(args.request.url, product.handle),
    isMobile: isMobileRequest(args.request),
  };
}

async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  if (!handle) throw new Error('Expected product handle to be defined');

  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions: getSelectedProductOptions(request),
    },
  });

  if (!product?.id) throw new Response(null, {status: 404});

  redirectIfHandleIsLocalized(request, {handle, data: product});
  return {product};
}

export default function Product() {
  const {product, recommendations, tryOn, tryOnLink, isMobile} =
    useLoaderData<typeof loader>();
  const t = useTranslation();

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
  const materials = parseProductMaterials(product);
  const colorOption = product.options?.find((option) =>
    isColorOption(option.name),
  );
  const selectedColor = selectedVariant?.selectedOptions?.find((option) =>
    isColorOption(option.name),
  )?.value;
  const visibleMaterials = materialsForColor(
    materials,
    colorOption?.optionValues.map((value) => value.name) ?? [],
    selectedColor,
  );

  const productDetails = [
    {label: t('product.detail.type'), value: product.productType},
    {label: t('product.detail.metal'), value: product.metal?.value},
    {label: t('product.detail.gemstone'), value: product.gemstone?.value},
    {label: t('product.detail.gemColor'), value: product.gemColor?.value},
  ]
    .map((item) => ({
      ...item,
      value: formatMetafieldValue(item.value),
    }))
    .filter((item) => item.value !== '');

  return (
    <div className="mx-auto max-w-[1280px] px-[4vw] pb-20 pt-6">
      <nav
        aria-label={t('product.breadcrumb')}
        className="mb-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest text-primary"
      >
        <Link to="/" className="hover:text-ink">
          {t('nav.home')}
        </Link>
        {collection ? (
          <>
            <span aria-hidden="true">/</span>
            <Link
              to={`/collections/${collection.handle}`}
              className="hover:text-ink"
            >
              {collection.title}
            </Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span className="text-ink" aria-current="page">
          {product.title}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
        <ProductGallery
          images={product.images.nodes}
          variantImage={selectedVariant?.image}
          title={product.title}
        />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <AllergenBadge allergens={product.allergens} className="mb-3" />

          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-tight">
              {product.title}
            </h1>
            <div className="flex items-center gap-2">
              <FavoriteButton productId={product.id} title={product.title} />
              <FittingRoomButton
                canTryOn={tryOn !== null}
                productId={product.id}
                title={product.title}
              />
            </div>
          </div>

          <div className="mt-3 text-lg">
            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
            />
          </div>

          {tryOn ? (
            <div className="mt-6">
              <TryOnButton
                isMobile={isMobile}
                piece={tryOn}
                title={product.title}
                tryOnLink={tryOnLink}
              />
            </div>
          ) : null}

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
                {t('product.description')}
                <span aria-hidden="true" className="group-open:hidden">
                  +
                </span>
                <span aria-hidden="true" className="hidden group-open:inline">
                  −
                </span>
              </summary>
              <div
                className="prose-sm mt-4 leading-7 text-primary [&_p]:mb-3"
                dangerouslySetInnerHTML={{__html: product.descriptionHtml}}
              />
            </details>

            {productDetails.length > 0 ? (
              <details className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-widest [&::-webkit-details-marker]:hidden">
                  {t('product.details')}
                  <span aria-hidden="true" className="group-open:hidden">
                    +
                  </span>
                  <span aria-hidden="true" className="hidden group-open:inline">
                    −
                  </span>
                </summary>

                <dl className="mt-5 space-y-3 text-sm">
                  {productDetails.map(({label, value}) => (
                    <div
                      key={label}
                      className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4"
                    >
                      <dt className="text-primary">{label}</dt>
                      <dd className="break-words text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ) : null}

            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-widest [&::-webkit-details-marker]:hidden">
                {t('product.shipping')}
                <span aria-hidden="true" className="group-open:hidden">
                  +
                </span>
                <span aria-hidden="true" className="hidden group-open:inline">
                  −
                </span>
              </summary>
              <p className="mt-4 leading-7 text-primary">
                {t('product.shippingText')}
              </p>
            </details>

            {visibleMaterials.length > 0 ? (
              <details className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-widest [&::-webkit-details-marker]:hidden">
                  {t('product.materials')}
                  <span aria-hidden="true" className="group-open:hidden">
                    +
                  </span>
                  <span aria-hidden="true" className="hidden group-open:inline">
                    −
                  </span>
                </summary>
                <ul className="mt-4 space-y-1 leading-7 text-primary">
                  {visibleMaterials.map((material) => (
                    <li key={material.handle}>{material.label}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <Await resolve={recommendations}>
          {(items) =>
            items.length ? (
              <section className="mt-20" aria-labelledby="related-heading">
                <h2 id="related-heading" className="font-display text-2xl">
                  {t('product.related')}
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
    jewelryMaterial: metafield(namespace: "shopify", key: "jewelry-material") {
      ...JewelietteMaterialMetafield
    }
    watchMaterial: metafield(namespace: "shopify", key: "watch-material") {
      ...JewelietteMaterialMetafield
    }
    metal: metafield(namespace: "custom", key: "metal") { value }
    gemstone: metafield(namespace: "custom", key: "gemstone") { value }
    gemColor: metafield(namespace: "custom", key: "gem_color") { value }
    allergens: metafield(namespace: "custom", key: "allergens") { value }
    tryOnOverlay: metafield(namespace: "custom", key: "try_on_overlay") {
      reference {
        ... on MediaImage { image { url } }
        ... on GenericFile { url }
      }
    }
    tryOnSize: metafield(namespace: "custom", key: "try_on_size_cm") { value }
    featuredImage { id url altText width height }
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
  ${JEWELIETTE_MATERIAL_METAFIELD_FRAGMENT}
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
