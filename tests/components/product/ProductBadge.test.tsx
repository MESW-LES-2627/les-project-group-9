import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {ProductBadge} from '~/components/product/ProductBadge';

describe('ProductBadge', () => {
  it('renders the badge text when a product has a badge', () => {
    render(<ProductBadge value="Limited Edition" />);

    expect(screen.getByText('Limited Edition')).toBeInTheDocument();
  });

  it('renders no badge when the product has no badge', () => {
    render(<ProductBadge value={null} />);

    expect(screen.queryByText('Limited Edition')).not.toBeInTheDocument();
  });

  it('renders no badge when the badge value is empty', () => {
    render(<ProductBadge value="" />);

    expect(screen.queryByText('Limited Edition')).not.toBeInTheDocument();
  });

  it('supports the warning tone', () => {
    render(<ProductBadge tone="warning" value="Allergen" />);

    expect(screen.getByText('Allergen')).toHaveClass('bg-amber-200');
  });
});
