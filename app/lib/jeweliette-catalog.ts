import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';

export type CatalogMoney = {
  amount: string;
  currencyCode: CurrencyCode;
};

export type CatalogImage = {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type CatalogProduct = {
  id: string;
  title: string;
  handle: string;
  productType?: string;
  featuredImage?: CatalogImage | null;
  priceRange: {
    minVariantPrice: CatalogMoney;
    maxVariantPrice?: CatalogMoney;
  };
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

    material: metafield(namespace: "custom", key: "material") {
      value
    }

    badge: metafield(namespace: "custom", key: "badge") {
      value
    }

    featuredImage {
      id
      url
      altText
      width
      height
    }

    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }

    variants(first: 2) {
      nodes {
        id
        availableForSale
      }
    }
  }
` as const;