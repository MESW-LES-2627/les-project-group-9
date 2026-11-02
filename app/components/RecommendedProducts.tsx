import {useEffect} from 'react';
import {useFetcher} from 'react-router';
import type {CatalogProduct} from '~/lib/jeweliette-catalog';
import {useFavorites} from '~/lib/favorites';
import {ProductItem} from '~/components/ProductItem';

type RecommendationLoaderData = {
  products: CatalogProduct[];
  reasons: Record<string, string[]>;
};

export function RecommendedProducts({
  className = '',
}: {
  className?: string;
}) {
  const {ids, ready, syncing} = useFavorites();
  const fetcher = useFetcher<RecommendationLoaderData>();
  const key = ids.join(',');
  const url = ready && ids.length ? '/api/recommendations?limit=4' : null;

  useEffect(() => {
    if (!url || syncing) return;

    const timeout = setTimeout(() => {
      void fetcher.load(url);
    }, 150);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, syncing]);

  const products = fetcher.data?.products ?? [];

  if (!url || !products.length) return null;

  return (
    <section aria-labelledby="recommendations-heading" className={className}>
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">
          Because you liked these
        </p>
        <h2
          id="recommendations-heading"
          className="mt-3 font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-none tracking-tight"
        >
          You may also like
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {products.map((product) => {
          const reasons = fetcher.data?.reasons?.[product.id] ?? [];
          const reason = reasons.slice(0, 2).join(' · ');

          return (
            <div key={product.id}>
              <ProductItem product={product} />
              {reason ? (
                <p className="mt-2 text-[11px] uppercase tracking-wider text-primary">
                  {reason}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
