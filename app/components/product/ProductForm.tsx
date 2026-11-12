import {Link, useNavigate} from 'react-router';
import {
  type MappedProductOptions,
  type OptimisticCartLineInput,
  CartForm,
} from '@shopify/hydrogen';
import type {ProductFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/layout/Aside';
import {useTranslation} from '~/lib/i18n';
import {AddToBagGuard} from '~/components/product/AddToBagGuard';
import {RingSizeHelp} from '~/components/product/RingSizeHelp';
import {isColorOption} from '~/lib/options';

type Props = {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  allergens?: {value: string} | null;
  /** True for products in the "Rings" category. Enables the ring size helper. */
  isRing?: boolean;
};

export function ProductForm({
  productOptions,
  selectedVariant,
  allergens,
  isRing = false,
}: Props) {
  const navigate = useNavigate();
  const {open} = useAside();
  const t = useTranslation();

  const lines: OptimisticCartLineInput[] = selectedVariant
    ? [{merchandiseId: selectedVariant.id, quantity: 1, selectedVariant}]
    : [];

  return (
    <div className="space-y-6">
      {productOptions
        .filter((option) => option.optionValues.length > 1)
        .map((option) => {
          const isColor = isColorOption(option.name);
          const selectedValue = option.optionValues.find(
            (v) => v.selected,
          )?.name;

          return (
            <fieldset key={option.name}>
              <legend className="mb-3 text-[11px] uppercase tracking-widest text-primary">
                {option.name}
                {selectedValue ? (
                  <span className="ml-2 text-ink">{selectedValue}</span>
                ) : null}
              </legend>

              <div className="flex flex-wrap gap-2">
                {option.optionValues.map((value) => {
                  const {
                    name,
                    handle,
                    variantUriQuery,
                    selected,
                    available,
                    exists,
                    isDifferentProduct,
                    swatch,
                  } = value;

                  const swatchColor = swatch?.color ?? undefined;
                  const swatchImage = swatch?.image?.previewImage?.url;

                  const classes = isColor
                    ? `h-8 w-8 rounded-full border bg-cover bg-center ${
                        selected
                          ? 'ring-1 ring-ink ring-offset-2 border-ink'
                          : 'border-line'
                      } ${available ? '' : 'opacity-40'}`
                    : `min-h-10 min-w-12 border px-4 text-xs uppercase tracking-wider transition-colors ${
                        selected
                          ? 'border-ink bg-ink text-white'
                          : 'border-line bg-paper hover:border-ink'
                      } ${available ? '' : 'text-ink/40 line-through'}`;

                  const style = isColor
                    ? {
                        backgroundColor: swatchColor,
                        backgroundImage: swatchImage
                          ? `url(${swatchImage})`
                          : undefined,
                      }
                    : undefined;

                  if (isDifferentProduct) {
                    return (
                      <Link
                        key={option.name + name}
                        to={`/products/${handle}?${variantUriQuery}`}
                        prefetch="intent"
                        preventScrollReset
                        replace
                        aria-label={name}
                        title={name}
                        className={classes}
                        style={style}
                      >
                        {isColor ? null : name}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={option.name + name}
                      type="button"
                      disabled={!exists}
                      aria-label={name}
                      aria-pressed={selected}
                      title={
                        available ? name : t('product.optionSoldOut', {name})
                      }
                      className={`${classes} disabled:cursor-not-allowed disabled:opacity-30`}
                      style={style}
                      onClick={() => {
                        if (!selected) {
                          void navigate(`?${variantUriQuery}`, {
                            replace: true,
                            preventScrollReset: true,
                          });
                        }
                      }}
                    >
                      {isColor ? null : name}
                    </button>
                  );
                })}
              </div>

              {isRing && /^size$/i.test(option.name) ? <RingSizeHelp /> : null}
            </fieldset>
          );
        })}

      <CartForm
        route="/cart"
        action={CartForm.ACTIONS.LinesAdd}
        inputs={{lines}}
      >
        {(fetcher) => (
          <>
            <input name="analytics" type="hidden" value={JSON.stringify({})} />
            <AddToBagGuard allergens={allergens} onProceed={() => open('cart')}>
              {({onClick, loading}) => (
                <button
                  type="submit"
                  disabled={
                    !selectedVariant ||
                    !selectedVariant.availableForSale ||
                    fetcher.state !== 'idle' ||
                    loading
                  }
                  onClick={onClick}
                  className="flex min-h-12 w-full items-center justify-center bg-primary px-6 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!selectedVariant?.availableForSale
                    ? t('product.soldOut')
                    : fetcher.state !== 'idle'
                      ? t('product.adding')
                      : t('product.addToBag')}
                </button>
              )}
            </AddToBagGuard>
          </>
        )}
      </CartForm>
    </div>
  );
}
