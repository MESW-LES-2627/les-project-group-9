import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';

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
  productType?: string;
  material?: {value: string} | null;
  badge?: {value: string} | null;
  variants?: {
    nodes: Array<{
      id: string;
      availableForSale: boolean;
    }>;
  };
};

export const JEWELIETTE_PRODUCT_CARD_FRAGMENT = `#graphql
  fragment JewelietteProductCard on Product {
    id
    title
    handle
    productType
    material: metafield(namespace: "custom", key: "material") { value }
    badge: metafield(namespace: "custom", key: "badge") { value }
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