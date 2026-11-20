import {Link, useFetcher, type Fetcher} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {Money} from '~/components/shared/Money';
import React, {useEffect, useId, useRef} from 'react';
import {
  getEmptyPredictiveSearchResult,
  urlWithTrackingParams,
  type PredictiveSearchReturn,
} from '~/lib/search';
import {useAside} from '~/components/layout/Aside';
import {useTranslation} from '~/lib/i18n';

type PredictiveSearchItems = PredictiveSearchReturn['result']['items'];

type UsePredictiveSearchReturn = {
  term: React.MutableRefObject<string>;
  total: number;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  items: PredictiveSearchItems;
  fetcher: Fetcher<PredictiveSearchReturn>;
};

type SearchResultsPredictiveArgs = Pick<
  UsePredictiveSearchReturn,
  'term' | 'total' | 'inputRef' | 'items'
> & {
  state: Fetcher['state'];
  closeSearch: () => void;
};

type PartialPredictiveSearchResult<
  ItemType extends keyof PredictiveSearchItems,
  ExtraProps extends keyof SearchResultsPredictiveArgs = 'term' | 'closeSearch',
> = Pick<PredictiveSearchItems, ItemType> &
  Pick<SearchResultsPredictiveArgs, ExtraProps>;

type SearchResultsPredictiveProps = {
  children: (args: SearchResultsPredictiveArgs) => React.ReactNode;
};

/**
 * Component that renders predictive search results
 */
export function SearchResultsPredictive({
  children,
}: SearchResultsPredictiveProps) {
  const aside = useAside();
  const {term, inputRef, fetcher, total, items} = usePredictiveSearch();

  /*
   * Utility that resets the search input
   */
  function resetInput() {
    if (inputRef.current) {
      inputRef.current.blur();
      inputRef.current.value = '';
    }
  }

  /**
   * Utility that resets the search input and closes the search aside
   */
  function closeSearch() {
    resetInput();
    aside.close();
  }

  return children({
    items,
    closeSearch,
    inputRef,
    state: fetcher.state,
    term,
    total,
  });
}

SearchResultsPredictive.Articles = SearchResultsPredictiveArticles;
SearchResultsPredictive.Collections = SearchResultsPredictiveCollections;
SearchResultsPredictive.Pages = SearchResultsPredictivePages;
SearchResultsPredictive.Products = SearchResultsPredictiveProducts;
SearchResultsPredictive.Queries = SearchResultsPredictiveQueries;
SearchResultsPredictive.Empty = SearchResultsPredictiveEmpty;

const sectionHeadingClass =
  'text-xs font-medium uppercase tracking-[0.18em] text-primary';

function PredictiveSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className={sectionHeadingClass}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function PredictiveLinkList({
  title,
  links,
  closeSearch,
}: {
  title: string;
  links: Array<{id: string; title: string; url: string}>;
  closeSearch: () => void;
}) {
  if (!links.length) return null;

  return (
    <PredictiveSection title={title}>
      <ul className="mt-4 flex flex-col items-start gap-3 font-display text-xl text-primary sm:text-2xl">
        {links.map((link) => (
          <li key={link.id}>
            <Link
              className="hover:text-bark"
              onClick={closeSearch}
              prefetch="intent"
              to={link.url}
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </PredictiveSection>
  );
}

function SearchResultsPredictiveArticles({
  term,
  articles,
  closeSearch,
}: PartialPredictiveSearchResult<'articles'>) {
  const t = useTranslation();
  return (
    <PredictiveLinkList
      closeSearch={closeSearch}
      links={articles.map((article) => ({
        id: article.id,
        title: article.title,
        url: urlWithTrackingParams({
          baseUrl: `/blogs/${article.blog.handle}/${article.handle}`,
          trackingParams: article.trackingParameters,
          term: term.current ?? '',
        }),
      }))}
      title={t('search.articles')}
    />
  );
}

function SearchResultsPredictiveCollections({
  term,
  collections,
  closeSearch,
}: PartialPredictiveSearchResult<'collections'>) {
  const t = useTranslation();
  return (
    <PredictiveLinkList
      closeSearch={closeSearch}
      links={collections.map((collection) => ({
        id: collection.id,
        title: collection.title,
        url: urlWithTrackingParams({
          baseUrl: `/collections/${collection.handle}`,
          trackingParams: collection.trackingParameters,
          term: term.current,
        }),
      }))}
      title={t('common.collections')}
    />
  );
}

function SearchResultsPredictivePages({
  term,
  pages,
  closeSearch,
}: PartialPredictiveSearchResult<'pages'>) {
  const t = useTranslation();
  return (
    <PredictiveLinkList
      closeSearch={closeSearch}
      links={pages.map((page) => ({
        id: page.id,
        title: page.title,
        url: urlWithTrackingParams({
          baseUrl: `/pages/${page.handle}`,
          trackingParams: page.trackingParameters,
          term: term.current,
        }),
      }))}
      title={t('search.pages')}
    />
  );
}

function SearchResultsPredictiveProducts({
  term,
  products,
  closeSearch,
}: PartialPredictiveSearchResult<'products'>) {
  const t = useTranslation();
  if (!products.length) return null;

  return (
    <PredictiveSection title={t('search.pieces')}>
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {products.map((product) => {
          const productUrl = urlWithTrackingParams({
            baseUrl: `/products/${product.handle}`,
            trackingParams: product.trackingParameters,
            term: term.current,
          });

          const price = product?.selectedOrFirstAvailableVariant?.price;
          const image = product?.selectedOrFirstAvailableVariant?.image;

          return (
            <li className="min-w-0" key={product.id}>
              <Link
                className="group block"
                onClick={closeSearch}
                prefetch="intent"
                to={productUrl}
              >
                <div className="aspect-[4/5] overflow-hidden bg-secondary">
                  {image ? (
                    <Image
                      alt={image.altText || product.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      data={image}
                      sizes="(min-width: 768px) 220px, 45vw"
                    />
                  ) : null}
                </div>
                <p className="mt-3 truncate font-display text-base leading-tight text-ink group-hover:text-bark">
                  {product.title}
                </p>
                {price ? (
                  <p className="mt-1 text-sm text-primary">
                    <Money data={price} />
                  </p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </PredictiveSection>
  );
}

function SearchResultsPredictiveQueries({
  queries,
  queriesDatalistId,
}: PartialPredictiveSearchResult<'queries', never> & {
  queriesDatalistId: string;
}) {
  if (!queries.length) return null;

  return (
    <datalist id={queriesDatalistId}>
      {queries.map((suggestion) => {
        if (!suggestion) return null;

        return <option key={suggestion.text} value={suggestion.text} />;
      })}
    </datalist>
  );
}

function SearchResultsPredictiveEmpty({
  term,
}: {
  term: React.MutableRefObject<string>;
}) {
  const t = useTranslation();
  if (!term.current) {
    return null;
  }

  return <p>{t('search.noResultsFor', {term: term.current})}</p>;
}

/**
 * Hook that returns the predictive search results and fetcher and input ref.
 * @example
 * '''ts
 * const { items, total, inputRef, term, fetcher } = usePredictiveSearch();
 * '''
 **/
function usePredictiveSearch(): UsePredictiveSearchReturn {
  const fetcher = useFetcher<PredictiveSearchReturn>({key: 'search'});
  const term = useRef<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pendingTerm =
    fetcher.formData?.get('q') ??
    (fetcher.formAction
      ? new URL(
        fetcher.formAction,
        'https://search.invalid',
      ).searchParams.get('q')
      : null);

  term.current =
    fetcher.state !== 'idle' && pendingTerm !== null
      ? String(pendingTerm)
      : fetcher.data?.term ?? '';

  // capture the search input element as a ref
  useEffect(() => {
    inputRef.current =
      document.querySelector<HTMLInputElement>(
        '[role="dialog"][aria-hidden="false"] input[name="q"]',
      );
  });

  const {items, total} =
    fetcher?.data?.result ?? getEmptyPredictiveSearchResult();

  return {items, total, inputRef, term, fetcher};
}
