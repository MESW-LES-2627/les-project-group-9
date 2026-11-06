import {useEffect} from 'react';
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {SearchFormPredictive} from '~/components/search/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/search/SearchResultsPredictive';
import {Icon} from '~/components/shared/Icon';

type Suggestion = {title: string; to: string};

export function SearchOverlay({
                                open,
                                onClose,
                                suggestions,
                              }: {
  open: boolean;
  onClose: () => void;
  suggestions: Suggestion[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search Jeweliette"
      className="fixed inset-0 z-50 overflow-y-auto bg-cream"
    >
      <div className="flex h-16 items-center justify-between border-b border-line px-[4vw]">
        <span className="font-display text-xl">Jeweliette</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="flex h-10 w-10 items-center justify-center text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-[4vw] pb-20 pt-14">
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Search Jeweliette</p>

        <SearchFormPredictive className="mt-4">
          {({fetchResults, goToSearch, inputRef}) => (
            <div className="flex items-center border-b border-ink">
              <input
                ref={inputRef}
                name="q"
                type="search"
                autoComplete="off"
                placeholder="What are you looking for?"
                onChange={fetchResults}
                onFocus={fetchResults}
                className="w-full bg-transparent py-3 font-display text-[clamp(1.5rem,3vw,2.25rem)] placeholder:text-primary/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={goToSearch}
                aria-label="Search"
                className="flex h-10 w-10 shrink-0 items-center justify-center"
              >
                <Icon name="search" size={22} />
              </button>
            </div>
          )}
        </SearchFormPredictive>

        <SearchResultsPredictive>
          {({items, total, term, state, closeSearch}) => {
            const done = () => {
              closeSearch();
              onClose();
            };

            if (!term.current) {
              return (
                <div className="mt-10">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Explore</p>
                  <ul className="mt-3 divide-y divide-line border-y border-line">
                    {suggestions.map((s) => (
                      <li key={s.to}>
                        <Link
                          to={s.to}
                          onClick={onClose}
                          className="flex min-h-12 items-center justify-between font-display text-lg"
                        >
                          {s.title}
                          <span aria-hidden="true">→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }

            if (state === 'loading') {
              return <p className="mt-10 text-sm text-primary">Searching…</p>;
            }

            if (!total) {
              return (
                <p className="mt-10 text-sm text-primary">
                  No results for “{term.current}”.
                </p>
              );
            }

            return (
              <div className="mt-10">
                {items.products.length ? (
                  <>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Pieces</p>
                    <ul className="mt-3 divide-y divide-line border-y border-line">
                      {items.products.map((product) => {
                        const variant = product.selectedOrFirstAvailableVariant;
                        return (
                          <li key={product.id}>
                            <Link
                              to={`/products/${product.handle}`}
                              onClick={done}
                              className="flex items-center gap-4 py-3"
                            >
                              <div className="h-16 w-14 shrink-0 overflow-hidden bg-secondary">
                                {variant?.image ? (
                                  <Image
                                    data={variant.image}
                                    alt={product.title}
                                    width={112}
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <span className="min-w-0 flex-1 truncate font-display text-lg">
                                {product.title}
                              </span>
                              {variant?.price ? (
                                <span className="text-sm">
                                  <Money data={variant.price} withoutTrailingZeros />
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : null}

                {items.collections.length ? (
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {items.collections.map((collection) => (
                      <li key={collection.id}>
                        <Link
                          to={`/collections/${collection.handle}`}
                          onClick={done}
                          className="inline-flex min-h-10 items-center border border-line px-4 text-xs uppercase tracking-wider hover:border-ink"
                        >
                          {collection.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <Link
                  to={`/search?q=${encodeURIComponent(term.current)}`}
                  onClick={done}
                  className="mt-8 inline-flex min-h-11 items-center border-b border-ink text-[11px] uppercase tracking-widest"
                >
                  View all {total} results
                </Link>
              </div>
            );
          }}
        </SearchResultsPredictive>
      </div>
    </div>
  );
}