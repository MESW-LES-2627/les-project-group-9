export const CUSTOMER_PROFILE_QUERY = `#graphql
  query CustomerProfile {
    customer {
      id
      favorites: metafield(namespace: "custom", key: "favorites") {
        value
      }
    }
  }
` as const;
