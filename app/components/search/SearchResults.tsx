import {Link} from 'react-router';
import {Pagination} from '@shopify/hydrogen';
import {urlWithTrackingParams, type RegularSearchReturn} from '~/lib/search';
import {ProductItem} from '~/components/product/ProductItem';
import {useTranslation} from '~/lib/i18n';

type SearchItems = RegularSearchReturn['result']['items'];
type PartialSearchResult<ItemType extends keyof SearchItems> = Pick<
  SearchItems,
  ItemType
> &
  Pick<RegularSearchReturn, 'term'>;

type SearchResultsProps = RegularSearchReturn & {
  children: (args: SearchItems & {term: string}) => React.ReactNode;
};

export function SearchResults({
  term,
  result,
  children,
}: Omit<SearchResultsProps, 'error' | 'type'>) {
  if (!result?.total) {
    return null;
  }

  return children({...result.items, term});
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Pages = SearchResultsPages;
SearchResults.Products = SearchResultsProducts;
SearchResults.Empty = SearchResultsEmpty;

function SearchResultsArticles({
  term,
  articles,
}: PartialSearchResult<'articles'>) {
  const t = useTranslation();
  if (!articles?.nodes.length) {
    return null;
  }

  return (
    <div className="space-y-4 [&_h2]:font-display [&_h2]:text-2xl">
      <h2>{t('search.articles')}</h2>
      <div>
        {articles?.nodes?.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${article.handle}`,
            trackingParams: article.trackingParameters,
            term,
          });

          return (
            <div className="border-b border-line py-4 text-sm [&_a]:underline [&_a]:underline-offset-4" key={article.id}>
              <Link prefetch="intent" to={articleUrl}>
                {article.title}
              </Link>
            </div>
          );
        })}
      </div>
      <br />
    </div>
  );
}

function SearchResultsPages({term, pages}: PartialSearchResult<'pages'>) {
  const t = useTranslation();
  if (!pages?.nodes.length) {
    return null;
  }

  return (
    <div className="space-y-4 [&_h2]:font-display [&_h2]:text-2xl">
      <h2>{t('search.pages')}</h2>
      <div>
        {pages?.nodes?.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term,
          });

          return (
            <div className="border-b border-line py-4 text-sm [&_a]:underline [&_a]:underline-offset-4" key={page.id}>
              <Link prefetch="intent" to={pageUrl}>
                {page.title}
              </Link>
            </div>
          );
        })}
      </div>
      <br />
    </div>
  );
}

function SearchResultsProducts({
                                 products,
                               }: PartialSearchResult<'products'>) {
  const t = useTranslation();
  if (!products?.nodes.length) return null;

  const paginationClass =
    'my-8 inline-flex min-h-11 items-center border border-primary px-6 text-xs uppercase tracking-widest text-primary transition-colors hover:bg-bark hover:text-white';

  return (
    <section>
      <h2 className="mb-6 font-display text-2xl">{t('search.pieces')}</h2>

      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => (
          <>
            <PreviousLink className={paginationClass}>
              {isLoading ? t('common.loading') : t('common.loadPrevious')}
            </PreviousLink>

            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
              {nodes.map((product) => (
                <ProductItem
                  key={product.id}
                  product={product}
                />
              ))}
            </div>

            <NextLink className={paginationClass}>
              {isLoading ? t('common.loading') : t('common.loadMore')}
            </NextLink>
          </>
        )}
      </Pagination>
    </section>
  );
}

function SearchResultsEmpty() {
  const t = useTranslation();
  return (
    <div className="border-y border-line py-12 text-center">
      <h2 className="font-display text-3xl">{t('search.noResults')}</h2>
      <p className="mt-4 text-sm text-primary">
        {t('search.tryAnotherProduct')}
      </p>
    </div>
  );
}