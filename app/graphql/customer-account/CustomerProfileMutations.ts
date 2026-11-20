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

export const METAFIELDS_DELETE_MUTATION = `#graphql
  mutation CustomerMetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields {
        key
        namespace
      }
      userErrors {
        message
      }
    }
  }
` as const;
