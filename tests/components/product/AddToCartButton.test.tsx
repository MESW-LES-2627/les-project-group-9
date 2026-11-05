import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({fetcherState: 'idle'}));

vi.mock('@shopify/hydrogen', () => {
  const CartForm = Object.assign(
    ({children}: {children: (fetcher: {state: string}) => React.ReactNode}) => (
      <form onSubmit={(event) => event.preventDefault()}>
        {children({state: mocks.fetcherState})}
      </form>
    ),
    {ACTIONS: {LinesAdd: 'LinesAdd'}},
  );

  return {CartForm};
});

import {AddToCartButton} from '~/components/product/AddToCartButton';

const lines = [{merchandiseId: 'variant-1', quantity: 1}];

beforeEach(() => {
  mocks.fetcherState = 'idle';
});

describe('AddToCartButton', () => {
  it('is enabled when the variant is available', () => {
    render(<AddToCartButton lines={lines}>Add to bag</AddToCartButton>);

    expect(screen.getByRole('button', {name: 'Add to bag'})).toBeEnabled();
  });

  it('is disabled when the variant is unavailable', () => {
    render(
      <AddToCartButton disabled lines={lines}>
        Sold out
      </AddToCartButton>,
    );

    expect(screen.getByRole('button', {name: 'Sold out'})).toBeDisabled();
  });

  it('is disabled while the cart is being updated', () => {
    mocks.fetcherState = 'submitting';

    render(<AddToCartButton lines={lines}>Add to bag</AddToCartButton>);

    expect(screen.getByRole('button', {name: 'Add to bag'})).toBeDisabled();
  });

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();

    render(
      <AddToCartButton lines={lines} onClick={onClick}>
        Add to bag
      </AddToCartButton>,
    );

    await userEvent.click(screen.getByRole('button', {name: 'Add to bag'}));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
