import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  open: vi.fn(),
  requestSubmit: vi.fn(),
  useAllergenMatches: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigate,
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  >) => <a {...props}>{children}</a>,
}));

vi.mock('~/components/Aside', () => ({
  useAside: () => ({open: mocks.open}),
}));

vi.mock('~/lib/profile/useAllergenMatches', () => ({
  useAllergenMatches: mocks.useAllergenMatches,
}));

vi.mock('@shopify/hydrogen', () => {
  const CartForm = Object.assign(
    ({children}: {children: (fetcher: {state: string}) => React.ReactNode}) => (
      <form onSubmit={(event) => event.preventDefault()}>
        {children({state: 'idle'})}
      </form>
    ),
    {ACTIONS: {LinesAdd: 'LinesAdd'}},
  );

  return {CartForm};
});

import {ProductForm} from '../../app/components/ProductForm';

const selectedVariant = {
  id: 'gid://shopify/ProductVariant/1',
  availableForSale: true,
} as never;

function renderForm() {
  return render(
    <ProductForm
      allergens={{value: '["nickel"]'}}
      productOptions={[]}
      selectedVariant={selectedVariant}
    />,
  );
}

beforeEach(() => {
  mocks.navigate.mockReset();
  mocks.open.mockReset();
  mocks.requestSubmit.mockReset();
  mocks.useAllergenMatches.mockReset();

  Object.defineProperty(HTMLFormElement.prototype, 'requestSubmit', {
    configurable: true,
    value: mocks.requestSubmit,
  });
});

describe('ProductForm add to bag', () => {
  it('warns before adding a matching allergen and can be cancelled', async () => {
    const user = userEvent.setup();
    mocks.useAllergenMatches.mockReturnValue({
      matches: ['nickel'],
      loading: false,
    });

    renderForm();

    await user.click(screen.getByRole('button', {name: 'Add to bag'}));

    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveTextContent(/contains Nickel/i);
    expect(dialog.closest('form')).toBeNull();
    expect(dialog).toHaveFocus();
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.requestSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.requestSubmit).not.toHaveBeenCalled();
  });

  it('adds the item after the shopper confirms the warning', async () => {
    const user = userEvent.setup();
    mocks.useAllergenMatches.mockReturnValue({
      matches: ['nickel'],
      loading: false,
    });

    renderForm();

    await user.click(screen.getByRole('button', {name: 'Add to bag'}));
    await user.click(screen.getByRole('button', {name: 'Yes, add to bag'}));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.requestSubmit).toHaveBeenCalledTimes(1);
    expect(mocks.open).toHaveBeenCalledWith('cart');
  });

  it('adds immediately when nothing matches the shopper allergies', async () => {
    const user = userEvent.setup();
    mocks.useAllergenMatches.mockReturnValue({matches: [], loading: false});

    renderForm();

    await user.click(screen.getByRole('button', {name: 'Add to bag'}));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.open).toHaveBeenCalledWith('cart');
    expect(mocks.requestSubmit).not.toHaveBeenCalled();
  });

  it('waits for the profile before allowing add to bag', () => {
    mocks.useAllergenMatches.mockReturnValue({matches: [], loading: true});

    renderForm();

    expect(screen.getByRole('button', {name: 'Add to bag'})).toBeDisabled();
  });
});
