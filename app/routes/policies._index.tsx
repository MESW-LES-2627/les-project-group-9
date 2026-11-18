import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/policies._index';
import {useTranslation} from '~/lib/i18n';
import type {PoliciesQuery, PolicyItemFragment} from 'storefrontapi.generated';

export async function loader({context}: Route.LoaderArgs) {
  const data: PoliciesQuery = await context.storefront.query(POLICIES_QUERY);

  const shopPolicies = data.shop;
  const policies: PolicyItemFragment[] = [
    shopPolicies?.privacyPolicy,
    shopPolicies?.shippingPolicy,
    shopPolicies?.termsOfService,
    shopPolicies?.refundPolicy,
    shopPolicies?.subscriptionPolicy,
  ].filter((policy): policy is PolicyItemFragment => policy != null);

  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();
  const t = useTranslation();

  return (
    <section className="mx-auto max-w-6xl px-[5vw] pb-24 pt-12">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">
        {t('policies.eyebrow')}
      </p>

      <h1 className="mb-10 mt-4 font-display text-4xl">
        {t('policies.title')}
      </h1>

      <ul className="divide-y divide-line border-y border-line">
        {policies.map((policy) => (
          <li key={policy.id}>
            <Link
              to={`/policies/${policy.handle}`}
              className="flex min-h-16 items-center justify-between gap-6 py-4 font-display text-xl hover:text-bark"
            >
              {policy.title}
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
` as const;
