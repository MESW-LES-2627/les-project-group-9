export const CUSTOMER_PROFILE_QUERY = `#graphql
  query CustomerProfile {
    customer {
      id
      favorites: metafield(namespace: "custom", key: "favorites") {
        value
      }
      preferences: metafield(namespace: "custom", key: "preferences") {
        value
      }
    }
  }
` as const;
