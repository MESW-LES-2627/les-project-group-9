import {Form, Link} from 'react-router';
import {parseFilterObject, serializeFilterInput} from '~/lib/search';
import {PriceRange} from './PriceRange';
import {useTranslation, type MessageKey} from '~/lib/i18n';

type Filter = {
  id: string;
  label: string;
  type: string;
  values: Array<{
    id: string;
    label: string;
    count: number;
    input: unknown;
  }>;
};

type Props = {
  filters: Filter[];
  selectedFilters: string[];
  priceMin: string;
  priceMax: string;
  clearHref: string;
  query?: string;
  currencyCode?: string;
  sort?: string;
  sortOptions?: Array<{value: string; label: string}>;
};

/**
 * Filter IDs whose label the app supplies instead of Shopify's (Shopify's
 * default labels for these are generic or mention metafield names). Any other
 * filter shows the label Shopify returns for the request's language.
 */
const FILTER_LABEL_KEYS: Record<string, MessageKey> = {
  'filter.v.availability': 'filters.label.availability',
  'filter.v.price': 'filters.label.price',
  'filter.p.product_type': 'filters.label.productType',
  'filter.p.vendor': 'filters.label.brand',
  'filter.p.m.shopify.jewelry-material': 'filters.label.material',
  'filter.p.m.shopify.watch-material': 'filters.label.material',
  'filter.p.m.custom.metal': 'filters.label.metal',
  'filter.p.m.custom.gem_color': 'filters.label.gemColor',
};

export function CatalogFilters({
  filters,
  selectedFilters,
  priceMin,
  priceMax,
  clearHref,
  query,
  currencyCode,
  sort,
  sortOptions = [],
}: Props) {
  const t = useTranslation();
  const active = selectedFilters.length > 0 || priceMin || priceMax;

  const summaryClass =
    'flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 text-xs uppercase tracking-widest';

  const panelClass =
    'absolute right-0 top-full z-30 max-h-96 min-w-60 overflow-y-auto border border-line bg-paper p-4 shadow-stack';

  const visibleFilters = filters
    .map((filter) => ({
      ...filter,
      values: filter.values.filter(
        (value) => parseFilterObject(value.input).available !== false,
      ),
    }))
    .filter((filter) => filter.values.length > 0);

  return (
    <Form
      key={JSON.stringify([query, sort, selectedFilters, priceMin, priceMax])}
      method="get"
      preventScrollReset
      className="relative z-10 my-8 flex flex-wrap items-center justify-end border-y border-line"
      onChange={(event) => {
        const target = event.target;

        if (!(target instanceof HTMLInputElement)) return;

        if (target.type === 'checkbox' || target.type === 'radio') {
          event.currentTarget.requestSubmit();
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;

        event.currentTarget
          .querySelectorAll<HTMLDetailsElement>('details')
          .forEach((panel) => {
            panel.open = false;
          });
      }}
      onClickCapture={(event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const summary = target.closest('summary');
        const selected = summary?.parentElement;

        if (!(selected instanceof HTMLDetailsElement)) {
          return;
        }

        event.currentTarget
          .querySelectorAll<HTMLDetailsElement>('details[open]')
          .forEach((panel) => {
            if (panel !== selected) panel.open = false;
          });
      }}
    >
      {query !== undefined ? (
        <input type="hidden" name="q" value={query} />
      ) : null}

      {active ? (
        <Link
          to={clearHref}
          className="mr-auto inline-flex min-h-12 items-center px-3 text-xs uppercase tracking-widest underline"
        >
          {t('filters.clear')}
        </Link>
      ) : null}

      {visibleFilters.map((filter) => (
        <details key={filter.id} className="relative border-l border-line">
          <summary className={summaryClass}>
            {FILTER_LABEL_KEYS[filter.id]
              ? t(FILTER_LABEL_KEYS[filter.id])
              : filter.label}
            <span aria-hidden="true">+</span>
          </summary>

          <div className={panelClass}>
            {filter.type === 'PRICE_RANGE' ? (
              <PriceRange
                values={filter.values}
                priceMin={priceMin}
                priceMax={priceMax}
                currencyCode={currencyCode}
              />
            ) : (
              filter.values.map((value) => {
                const input = serializeFilterInput(value.input);
                const selected = selectedFilters.includes(input);

                return (
                  <label
                    key={value.id}
                    className="flex min-h-11 items-center gap-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="filter"
                      value={input}
                      defaultChecked={selected}
                      disabled={value.count === 0 && !selected}
                      className="h-4 w-4 accent-primary"
                    />

                    <span>
                      {parseFilterObject(value.input).available === true
                        ? t('filters.inStock')
                        : value.label}{' '}
                      <span className="text-primary">({value.count})</span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </details>
      ))}

      {sortOptions.length > 0 ? (
        <details className="relative border-l border-line">
          <summary className={summaryClass}>
            {t('filters.sortBy')} <span aria-hidden="true">+</span>
          </summary>

          <div className={panelClass}>
            {sortOptions.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  type="radio"
                  name="sort"
                  value={option.value}
                  defaultChecked={sort === option.value}
                  className="h-4 w-4 accent-primary"
                />
                {option.label}
              </label>
            ))}
          </div>
        </details>
      ) : null}
    </Form>
  );
}
