export const METAFIELDS_SET_MUTATION = `#graphql
  mutation CustomerFavoritesSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        value
      }
      userErrors {
        message
      }
    }
  }
` as const;
