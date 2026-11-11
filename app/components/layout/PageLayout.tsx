import {Await, Link} from 'react-router';
import {Suspense, useId} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside, useAside} from '~/components/layout/Aside';
import {Footer} from '~/components/layout/Footer';
import {Header, HeaderMenu} from '~/components/layout/Header';
import {LanguageSelector} from '~/components/layout/LanguageSelector';
import {CartMain} from '~/components/cart/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/search/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/search/SearchResultsPredictive';
import {Icon} from '~/components/shared/Icon';
import {useTranslation} from '~/lib/i18n';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  const t = useTranslation();

  return (
    <Aside.Provider>
      <a
        className="fixed left-4 top-4 z-[100] -translate-y-24 bg-ink px-4 py-2 text-sm text-white focus:translate-y-0"
        href="#main-content"
      >
        {t('nav.skipToContent')}
      </a>
      <CartAside cart={cart} />
      <SearchAside />
      <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} />
      <Header
        header={header}
        cart={cart}
        isLoggedIn={isLoggedIn}
        publicStoreDomain={publicStoreDomain}
      />
      <main id="main-content">{children}</main>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
      />
    </Aside.Provider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  const t = useTranslation();

  return (
    <Aside type="cart" heading={t('nav.shoppingBag')}>
      <div className="p-5 sm:p-8 h-full">
        <Suspense fallback={<CartSkeleton />}>
          <Await resolve={cart}>
            {(resolvedCart) => <CartMain cart={resolvedCart} layout="aside" />}
          </Await>
        </Suspense>
      </div>
    </Aside>
  );
}

function CartSkeleton() {
  const t = useTranslation();
  return (
    <div aria-label={t('cart.loading')} className="animate-pulse space-y-5">
      {[0, 1].map((item) => (
        <div className="flex gap-4" key={item}>
          <div className="h-28 w-24 bg-secondary/60" />
          <div className="flex-1 space-y-3 py-2">
            <div className="h-4 w-3/4 bg-secondary/60" />
            <div className="h-3 w-1/2 bg-secondary/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchAside() {
  const queriesDatalistId = useId();
  const t = useTranslation();

  return (
    <Aside type="search" heading={t('search.title')}>
      <div className="mx-auto max-w-[940px] px-5 py-10 sm:px-8 sm:py-16">
        <SearchFormPredictive className="flex items-center border-b border-primary pb-3">
          {({fetchResults, goToSearch, inputRef}) => (
            <>
              <Icon className="mr-4 shrink-0 text-primary" name="search" size={28} />
              <input
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent font-display text-[clamp(2rem,5vw,4rem)] leading-none text-primary outline-none placeholder:text-primary/45"
                list={queriesDatalistId}
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder={t('search.placeholder')}
                ref={inputRef}
                type="search"
              />
              <button
                aria-label={t('search.seeAll')}
                className="grid size-11 shrink-0 place-items-center text-primary hover:text-ink"
                onClick={goToSearch}
                type="button"
              >
                <Icon name="arrow" />
              </button>
            </>
          )}
        </SearchFormPredictive>

        <div className="mt-10">
          <SearchResultsPredictive>
            {({items, total, term, state, closeSearch}) => {
              const {articles, collections, pages, products, queries} = items;

              if (state === 'loading' && term.current) {
                return <p className="text-sm text-primary">{t('search.searching')}</p>;
              }

              if (!term.current) {
                return (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                      {t('search.explore')}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 font-display text-xl text-primary sm:text-2xl">
                      <Link onClick={closeSearch} to="/collections/all">{t('common.allPieces')}</Link>
                      <Link onClick={closeSearch} to="/collections/jewelry">{t('menu.jewelry')}</Link>
                      <Link onClick={closeSearch} to="/collections">{t('common.collections')}</Link>
                    </div>
                  </div>
                );
              }

              if (!total) {
                return (
                  <div className="py-12 text-center">
                    <p className="font-display text-3xl text-primary">{t('search.noResults')}</p>
                    <p className="mt-3 text-sm text-primary/70">
                      {t('search.tryAnotherTerm', {term: term.current})}
                    </p>
                  </div>
                );
              }

              return (
                <>
                  <SearchResultsPredictive.Queries
                    queries={queries}
                    queriesDatalistId={queriesDatalistId}
                  />
                  <div className="space-y-10">
                    <SearchResultsPredictive.Products products={products} closeSearch={closeSearch} term={term} />
                    <SearchResultsPredictive.Collections collections={collections} closeSearch={closeSearch} term={term} />
                    <SearchResultsPredictive.Pages pages={pages} closeSearch={closeSearch} term={term} />
                    <SearchResultsPredictive.Articles articles={articles} closeSearch={closeSearch} term={term} />
                  </div>
                  <Link
                    className="mt-10 inline-flex min-h-11 items-center gap-5 border-b border-ink text-xs font-medium uppercase tracking-[0.14em]"
                    onClick={closeSearch}
                    to={`${SEARCH_ENDPOINT}?q=${encodeURIComponent(term.current)}`}
                  >
                    {t('search.seeAll')} <Icon name="arrow" size={16} />
                  </Link>
                </>
              );
            }}
          </SearchResultsPredictive>
        </div>
      </div>
    </Aside>
  );
}

function MobileMenuAside({
  header,
  publicStoreDomain,
}: {
  header: PageLayoutProps['header'];
  publicStoreDomain: PageLayoutProps['publicStoreDomain'];
}) {
  const {open, close} = useAside();
  const t = useTranslation();

  return (
    <Aside type="mobile" heading={t('nav.menu')}>
      <HeaderMenu
        menu={header.menu}
        viewport="mobile"
        primaryDomainUrl={header.shop.primaryDomain.url}
        publicStoreDomain={publicStoreDomain}
      />
      <div className="mt-6 grid gap-3 px-5 text-xs font-medium uppercase tracking-[0.14em] text-primary">
        <Link className="flex min-h-11 items-center border-b border-line" to="/account" onClick={close}>
          {t('nav.myAccount')}
        </Link>
        <button
          type="button"
          className="flex min-h-11 items-center border-b border-line text-left text-xs font-medium uppercase tracking-[0.14em] text-primary"
          onClick={() => open('cart')}
        >
          {t('nav.shoppingBag')}
        </button>
        <LanguageSelector layout="inline" onSelect={close} />
      </div>
    </Aside>
  );
}
