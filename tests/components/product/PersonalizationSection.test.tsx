import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {PersonalizationSection} from '~/components/product/PersonalizationSection';
import type {PersonalizationGroup} from '~/lib/personalization';

const engraving: PersonalizationGroup = {
  kind: 'engraving',
  id: 'engraving',
  label: 'Engraving',
  optional: true,
  summary: '',
  errorSummary: null,
  priceDelta: null,
  error: null,
  maxLength: 20,
  value: '',
};

describe('PersonalizationSection', () => {
  it('renders one open row and no section header for a single group', () => {
    render(
      <PersonalizationSection
        groups={[engraving]}
        renderEditor={(group) => <div>{group.id} editor</div>}
      />,
    );

    expect(screen.queryByText('Personalize')).not.toBeInTheDocument();
    expect(screen.getByText('Engraving')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.queryByText('Add a message')).not.toBeInTheDocument();
    expect(screen.getByText('engraving editor')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /Engraving/})).toBeNull();
  });

  it('switches to summary rows and opens one editor at a time', async () => {
    const metal: PersonalizationGroup = {
      ...engraving,
      id: 'metal',
      label: 'Metal',
      summary: '18K Gold Vermeil',
      priceDelta: {amount: '35.00', currencyCode: 'EUR'},
    };

    render(
      <PersonalizationSection
        groups={[metal, engraving]}
        renderEditor={(group) => <div>{group.id} editor</div>}
      />,
    );

    expect(screen.getByText('Personalize')).toBeInTheDocument();
    expect(screen.getByText('18K Gold Vermeil')).toBeInTheDocument();
    expect(screen.queryByText('metal editor')).not.toBeInTheDocument();

    const metalRow = screen.getByRole('button', {name: /Metal/});
    expect(metalRow).toHaveAttribute('aria-expanded', 'false');
    expect(metalRow).not.toHaveAttribute('aria-controls');

    await userEvent.click(metalRow);

    const panelId = metalRow.getAttribute('aria-controls');
    expect(metalRow).toHaveAttribute('aria-expanded', 'true');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).toHaveTextContent(
      'metal editor',
    );
    expect(screen.getByText('18K Gold Vermeil')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: /Engraving/}));

    expect(screen.queryByText('metal editor')).not.toBeInTheDocument();
    expect(screen.getByText('engraving editor')).toBeInTheDocument();
  });
});
