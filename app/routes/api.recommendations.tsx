import {data} from 'react-router';
import type {Route} from './+types/api.recommendations';
import type {CatalogProductWithTraits} from '~/lib/jeweliette-catalog';
import {readCustomerProfile} from '~/lib/profile/customer.server';
import {getRecommendationCandidates} from '~/lib/recommendation/catalog.server';
import {recommendProducts} from '~/lib/recommendation/engine';
import {toProductTraits} from '~/lib/recommendation/traits';

const NO_STORE = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
} as const;

function parseLimit(raw: string | null): number {
  if (raw === null) return 4;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 4;
  return Math.min(12, Math.max(1, Math.floor(parsed)));
}

export async function loader({request, context}: Route.LoaderArgs) {
  const limit = parseLimit(new URL(request.url).searchParams.get('limit'));
  const loggedIn = await context.customerAccount.isLoggedIn().catch(() => false);

  if (!loggedIn) {
    return data({products: [], reasons: {}}, {headers: NO_STORE});
  }

  try {
    const profile = await readCustomerProfile(context);
    const favoriteIds = profile.favorites;
    const preferences = profile.preferences;

    if (!favoriteIds.length) {
      return data({products: [], reasons: {}}, {headers: NO_STORE});
    }

    const candidates = await getRecommendationCandidates(context);
    const products = candidates.map(toProductTraits);
    const favorites = products.filter((product) =>
      favoriteIds.includes(product.id),
    );

    if (!favorites.length) {
      return data({products: [], reasons: {}}, {headers: NO_STORE});
    }

    const results = recommendProducts({
      products,
      favorites,
      preferences,
      limit,
    });
    const productsById = new Map(
      candidates.map((product) => [product.id, product]),
    );
    const recommended = results
      .map((result) => productsById.get(result.id))
      .filter(
        (product): product is CatalogProductWithTraits => Boolean(product),
      );
    const reasons = Object.fromEntries(
      results.map((result) => [result.id, result.reasons]),
    );

    return data({products: recommended, reasons}, {headers: NO_STORE});
  } catch (error) {
    console.error('Recommendation query failed', error);
    return data({products: [], reasons: {}}, {headers: NO_STORE});
  }
}
