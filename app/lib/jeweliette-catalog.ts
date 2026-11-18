import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import type {CatalogMaterialsFields} from './materials';

export type CatalogMoney = {amount: string; currencyCode: CurrencyCode};

export type CatalogImage = {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type CatalogOptionValue = {
  name: string;
  swatch?: {
    color?: string | null;
    image?: {previewImage?: {url: string} | null} | null;
  } | null;
  firstSelectableVariant?: {
    id: string;
    availableForSale: boolean;
    image?: CatalogImage | null;
  } | null;
};

export type CatalogOption = {name: string; optionValues: CatalogOptionValue[]};

export type CatalogProduct = {
  id: string;
  title: string;
  handle: string;
  featuredImage?: CatalogImage | null;
  images?: {nodes: CatalogImage[]};
  options?: CatalogOption[];
  priceRange: {
    minVariantPrice: CatalogMoney;
    maxVariantPrice?: CatalogMoney;
  };
  selectedOrFirstAvailableVariant?: {
    id: string;
    availableForSale: boolean;
  } | null;
  productType?: string;
  allergens?: {value: string} | null;
  badge?: {value: string} | null;
  /** Try-on gate inputs (see `lib/try-on/catalog.ts`). */
  category?: {name?: string | null} | null;
  tryOnOverlay?: {
    reference?: {
      url?: string | null;
      image?: {url?: string | null} | null;
    } | null;
  } | null;
  tryOnSize?: {value?: string | null} | null;
  variants?: {
    nodes: Array<{
      id: string;
      availableForSale: boolean;
    }>;
  };
};

export type CatalogProductWithTraits = CatalogProduct &
  CatalogMaterialsFields & {
    category?: {id: string; name: string} | null;
    metal?: {value: string} | null;
    gemstone?: {value: string} | null;
    gemColor?: {value: string} | null;
    collections?: {
      nodes: Array<{handle: string}>;
    };
  };

export const JEWELIETTE_MATERIAL_METAFIELD_FRAGMENT = `#graphql
  fragment JewelietteMaterialMetafield on Metafield {
    references(first: 10) {
      nodes {
        ... on Metaobject {
          handle
          fields { key value }
        }
      }
    }
  }
` as const;

export const JEWELIETTE_PRODUCT_CARD_FRAGMENT = `#graphql
  fragment JewelietteProductCard on Product {
    id
    title
    handle
    productType
    allergens: metafield(namespace: "custom", key: "allergens") { value }
    badge: metafield(namespace: "custom", key: "product_badge") { value }
    featuredImage { id url altText width height }
    images(first: 2) { nodes { id url altText width height } }
    options {
      name
      optionValues {
        name
        swatch { color image { previewImage { url } } }
        firstSelectableVariant {
          id
          availableForSale
          image { id url altText width height }
        }
      }
    }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    selectedOrFirstAvailableVariant { id availableForSale }
  }
` as const;

/**
 * Try-on fields (see `lib/try-on/catalog.ts`). Use next to
 * `JewelietteProductCard`, which already selects `featuredImage`.
 */
export const JEWELIETTE_TRY_ON_FRAGMENT = `#graphql
  fragment JewelietteTryOn on Product {
    category { name }
    tryOnOverlay: metafield(namespace: "custom", key: "try_on_overlay") {
      reference {
        ... on MediaImage { image { url } }
        ... on GenericFile { url }
      }
    }
    tryOnSize: metafield(namespace: "custom", key: "try_on_size_cm") { value }
  }
` as const;

export const JEWELIETTE_RECOMMENDATION_PRODUCT_FRAGMENT = `#graphql
  fragment JewelietteRecommendationProduct on Product {
    ...JewelietteProductCard
    jewelryMaterial: metafield(namespace: "shopify", key: "jewelry-material") {
      ...JewelietteMaterialMetafield
    }
    watchMaterial: metafield(namespace: "shopify", key: "watch-material") {
      ...JewelietteMaterialMetafield
    }
    category { id name }
    metal: metafield(namespace: "custom", key: "metal") { value }
    gemstone: metafield(namespace: "custom", key: "gemstone") { value }
    gemColor: metafield(namespace: "custom", key: "gem_color") { value }
    collections(first: 10) { nodes { handle } }
  }
  ${JEWELIETTE_PRODUCT_CARD_FRAGMENT}
  ${JEWELIETTE_MATERIAL_METAFIELD_FRAGMENT}
` as const;

export function formatMetafieldValue(
  value: string | null | undefined,
): string {
  if (!value?.trim()) return '';

  const text = value.trim();

  // Storefront values sometimes carry these sentinels as plain text.
  if (/^(null|undefined)$/i.test(text)) return '';

  if (!text.startsWith('[')) return text;

  try {
    const parsed: unknown = JSON.parse(text);

    if (!Array.isArray(parsed)) return text;

    return parsed
      .filter(
        (item): item is string | number | boolean =>
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean',
      )
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ');
  } catch {
    return text;
  }
}
