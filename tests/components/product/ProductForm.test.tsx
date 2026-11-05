import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {MappedProductOptions} from '@shopify/hydrogen';
import type {ProductFragment} from 'storefrontapi.generated';

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

vi.mock('~/components/layout/Aside', () => ({
  useAside: () => ({open: mocks.open}),
}));

vi.mock('~/lib/profile/useAllergenMatches', () => ({
  useAllergenMatches: mocks.useAllergenMatches,
}));

const profile = vi.hoisted(() => ({useProfile: vi.fn()}));

vi.mock('~/lib/profile/ProfileProvider', () => ({
  useProfile: profile.useProfile,
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

import {ProductForm} from '~/components/product/ProductForm';

const productOptions = [
  {
    name: 'Color',
    optionValues: [
      {
        name: 'Gold',
        handle: 'ring',
        variantUriQuery: 'Color=Gold',
        selected: true,
        available: true,
        exists: true,
        isDifferentProduct: false,
        swatch: {color: '#d4af37'},
      },
      {
        name: 'Silver',
        handle: 'ring',
        variantUriQuery: 'Color=Silver',
        selected: false,
        available: true,
        exists: true,
        isDifferentProduct: false,
        swatch: {color: '#c0c0c0'},
      },
    ],
  },
] as MappedProductOptions[];

const selectedVariant = {
  id: 'variant-gold',
  availableForSale: true,
} as ProductFragment['selectedOrFirstAvailableVariant'];

const nickelAllergens = {value: '["nickel"]'};

function renderForm(allergens?: {value: string} | null) {
  return render(
    <ProductForm
      allergens={allergens}
      productOptions={productOptions}
      selectedVariant={selectedVariant}
    />,
  );
}

beforeEach(() => {
  mocks.navigate.mockReset();
  mocks.open.mockReset();
  mocks.requestSubmit.mockReset();
  mocks.useAllergenMatches.mockReset();
  mocks.useAllergenMatches.mockReturnValue({matches: [], loading: false});

  Object.defineProperty(HTMLFormElement.prototype, 'requestSubmit', {
    configurable: true,
    value: mocks.requestSubmit,
  });
});

describe('ProductForm swatches', () => {
  it('navigates to the selected color variant when a swatch is clicked', () => {
    renderForm();

    screen.getByRole('button', {name: 'Silver'}).click();

    expect(mocks.navigate).toHaveBeenCalledWith('?Color=Silver', {
      replace: true,
      preventScrollReset: true,
    });
  });

  it('does not navigate when the already selected swatch is clicked', () => {
    renderForm();

    screen.getByRole('button', {name: 'Gold'}).click();

    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('marks the selected color swatch as pressed', () => {
    renderForm();

    expect(screen.getByRole('button', {name: 'Gold'})).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', {name: 'Silver'})).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('paints each swatch with the color coming from the option', () => {
    renderForm();

    expect(screen.getByRole('button', {name: 'Gold'})).toHaveStyle({
      backgroundColor: '#d4af37',
    });
    expect(screen.getByRole('button', {name: 'Silver'})).toHaveStyle({
      backgroundColor: '#c0c0c0',
    });
  });

  it('uses the swatch image as the background when the option provides one', () => {
    const optionsWithImage = [
      {
        name: 'Color',
        optionValues: [
          {
            name: 'Gold',
            handle: 'ring',
            variantUriQuery: 'Color=Gold',
            selected: true,
            available: true,
            exists: true,
            isDifferentProduct: false,
            swatch: {color: '#d4af37'},
          },
          {
            name: 'Silver',
            handle: 'ring',
            variantUriQuery: 'Color=Silver',
            selected: false,
            available: true,
            exists: true,
            isDifferentProduct: false,
            swatch: {
              color: '#c0c0c0',
              image: {previewImage: {url: '/silver.jpg'}},
            },
          },
        ],
      },
    ] as MappedProductOptions[];

    render(
      <ProductForm
        productOptions={optionsWithImage}
        selectedVariant={selectedVariant}
      />,
    );

    expect(screen.getByRole('button', {name: 'Silver'})).toHaveStyle({
      backgroundImage: 'url(/silver.jpg)',
    });
  });
});

describe('ProductForm allergen guard', () => {
  it('warns before adding a matching allergen and can be cancelled', async () => {
    const user = userEvent.setup();
    mocks.useAllergenMatches.mockReturnValue({
      matches: ['nickel'],
      loading: false,
    });

    renderForm(nickelAllergens);

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

    renderForm(nickelAllergens);

    await user.click(screen.getByRole('button', {name: 'Add to bag'}));
    await user.click(screen.getByRole('button', {name: 'Yes, add to bag'}));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.requestSubmit).toHaveBeenCalledTimes(1);
    expect(mocks.open).toHaveBeenCalledWith('cart');
  });

  it('adds immediately when nothing matches the shopper allergies', async () => {
    const user = userEvent.setup();

    renderForm(nickelAllergens);

    await user.click(screen.getByRole('button', {name: 'Add to bag'}));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.open).toHaveBeenCalledWith('cart');
    expect(mocks.requestSubmit).not.toHaveBeenCalled();
  });

  it('waits for the profile before allowing add to bag', () => {
    mocks.useAllergenMatches.mockReturnValue({matches: [], loading: true});

    renderForm(nickelAllergens);

    expect(screen.getByRole('button', {name: 'Add to bag'})).toBeDisabled();
  });
});

describe('ring size helper', () => {
  const sizeOptions = [
    {
      name: 'Size',
      optionValues: [
        {
          name: '6',
          handle: 'ring',
          variantUriQuery: 'Size=6',
          selected: true,
          available: true,
          exists: true,
          isDifferentProduct: false,
        },
        {
          name: '7',
          handle: 'ring',
          variantUriQuery: 'Size=7',
          selected: false,
          available: true,
          exists: true,
          isDifferentProduct: false,
        },
      ],
    },
  ] as MappedProductOptions[];

  beforeEach(() => {
    profile.useProfile.mockReturnValue({
      status: 'ready',
      isLoggedIn: true,
      preferences: null,
    });
  });

  it('shows the helper on a ring product with a Size option', () => {
    render(
      <ProductForm
        productOptions={sizeOptions}
        selectedVariant={selectedVariant}
        isRing
      />,
    );

    expect(screen.getByRole('button', {name: 'Measurement Guide'})).toBeInTheDocument();
  });

  it('hides the helper on products that are not rings', () => {
    render(
      <ProductForm
        productOptions={sizeOptions}
        selectedVariant={selectedVariant}
      />,
    );

    expect(
      screen.queryByRole('button', {name: 'Measurement Guide'}),
    ).not.toBeInTheDocument();
  });

  it('hides the helper on a ring product without a Size option', () => {
    render(
      <ProductForm
        productOptions={productOptions}
        selectedVariant={selectedVariant}
        isRing
      />,
    );

    expect(
      screen.queryByRole('button', {name: 'Measurement Guide'}),
    ).not.toBeInTheDocument();
  });
});

it('uses the swatch image as the background when the option provides one', () => {
  const optionsWithImage = [
    {
      name: 'Color',
      optionValues: [
        {
          name: 'Gold',
          handle: 'ring',
          variantUriQuery: 'Color=Gold',
          selected: true,
          available: true,
          exists: true,
          isDifferentProduct: false,
          swatch: {color: '#d4af37'},
        },
        {
          name: 'Silver',
          handle: 'ring',
          variantUriQuery: 'Color=Silver',
          selected: false,
          available: true,
          exists: true,
          isDifferentProduct: false,
          swatch: {
            color: '#c0c0c0',
            image: {previewImage: {url: '/silver.jpg'}},
          },
        },
      ],
    },
  ] as MappedProductOptions[];

  render(
    <ProductForm
      productOptions={optionsWithImage}
      selectedVariant={selectedVariant}
    />,
  );

  expect(screen.getByRole('button', {name: 'Silver'})).toHaveStyle({
    backgroundImage: 'url(/silver.jpg)',
  });
});
