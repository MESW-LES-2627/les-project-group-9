/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  interface Env {
    /**
     * US-058 rating records (Admin API scopes `read_metaobjects`,
     * `write_metaobjects`), server-only. Either the static token of a legacy
     * custom app, or a Dev Dashboard app's client ID and secret (client
     * credentials grant). When none is set, ratings show as unavailable.
     */
    PRIVATE_ADMIN_API_TOKEN?: string;
    PRIVATE_ADMIN_API_CLIENT_ID?: string;
    PRIVATE_ADMIN_API_CLIENT_SECRET?: string;
  }
}
