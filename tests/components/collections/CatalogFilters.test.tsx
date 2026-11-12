import type {ReactNode} from 'react';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

vi.mock('react-router', () => ({
  Form: ({children}: {children: ReactNode}) => <form>{children}</form>,
  Link: ({children, to}: {children: ReactNode; to: string}) => (
    <a href={to}>{children}</a>
  ),
}));

import {CatalogFilters} from '~/components/collections/CatalogFilters';
import {LocaleContext, toAppLocale} from '~/lib/i18n';

const LANGUAGE = {en: 'EN', pt: 'PT_PT', fr: 'FR'} as const;

/*
 * Labels as Shopify returns them for a PT request once Portuguese is published:
 * the app-named filter (availability) and a filter the app does not name.
 */
const FILTERS = [
  {
    id: 'filter.v.availability',
    label: 'Disponibilidade (Shopify)',
    type: 'LIST',
    values: [
      {
        id: 'filter.v.availability.1',
        label: 'Em stock',
        count: 3,
        input: '{"available":true}',
      },
    ],
  },
  {
    id: 'filter.p.m.custom.style',
    label: 'Estilo',
    type: 'LIST',
    values: [
      {
        id: 'filter.p.m.custom.style.minimal',
        label: 'Minimalista',
        count: 2,
        input:
          '{"productMetafield":{"namespace":"custom","key":"style","value":"minimal"}}',
      },
    ],
  },
];

function renderIn(code: keyof typeof LANGUAGE) {
  return render(
    <LocaleContext.Provider
      value={toAppLocale({language: LANGUAGE[code], country: 'US'})}
    >
      <CatalogFilters
        filters={FILTERS}
        selectedFilters={[]}
        priceMin=""
        priceMax=""
        clearHref="/collections/all"
      />
    </LocaleContext.Provider>,
  );
}

describe('CatalogFilters labels', () => {
  it.each([
    ['en', 'Availability'],
    ['pt', 'Disponibilidade'],
    ['fr', 'Disponibilité'],
  ] as const)(
    'names the availability filter in %s from the dictionary',
    (code, label) => {
      renderIn(code);

      expect(
        screen.getByText(label, {selector: 'summary', exact: false}),
      ).toBeInTheDocument();
      expect(screen.queryByText(/\(Shopify\)/)).not.toBeInTheDocument();
    },
  );

  it('shows the Shopify label and values for filters the app does not name', () => {
    renderIn('pt');

    expect(
      screen.getByText('Estilo', {selector: 'summary', exact: false}),
    ).toBeInTheDocument();
    expect(screen.getByText('Minimalista', {exact: false})).toBeInTheDocument();
  });
});
