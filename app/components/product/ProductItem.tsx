import {useState} from 'react';
import {Link} from 'react-router';
import {CartForm, Image} from '@shopify/hydrogen';
import {Money} from '~/components/shared/Money';
import {type CatalogImage, type CatalogProduct} from '~/lib/jeweliette-catalog';
import {isColorOption} from '~/lib/options';
import {useTranslation} from '~/lib/i18n';
import {FavoriteButton} from '~/components/product/FavoriteButton';
import {ProductBadge} from '~/components/product/ProductBadge';
import {AllergenBadge} from '~/components/product/AllergenBadge';
import {AddToBagGuard} from '~/components/product/AddToBagGuard';

type Props = {product: CatalogProduct; loading?: 'eager' | 'lazy'};

export function ProductItem({product, loading = 'lazy'}: Props) {
  const t = useTranslation();
  const [variantImage, setVariantImage] = useState<CatalogImage | null>(null);

  const url = `/products/${product.handle}`;
  const colorOption = product.options?.find((o) => isColorOption(o.name));
  const swatches =
    colorOption && colorOption.optionValues.length > 1
      ? colorOption.optionValues
      : [];

  const primary = variantImage ?? product.featuredImage;
  const secondary = variantImage
    ? null
    : (product.images?.nodes.find((i) => i.url !== primary?.url) ?? null);

  const min = product.priceRange.minVariantPrice;
  const max = product.priceRange.maxVariantPrice;
  const isRange = max !== undefined && max.amount !== min.amount;
  const variants = product.variants?.nodes ?? [];
  const variant = variants.length === 1 ? variants[0] : null;
  const hasMultipleVariants = variants.length > 1;

  const canQuickAdd = variant?.availableForSale === true;

  const overlay =
    'absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition duration-300 ' +
    'group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 ' +
    '[@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100';

  const buttonBase =
    'flex min-h-10 w-full items-center justify-center px-3 text-[11px] font-medium uppercase tracking-widest transition-colors';

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
        <Link
          to={url}
          prefetch="intent"
          aria-label={t('product.view', {title: product.title})}
          className="absolute inset-0 block"
        >
          {primary ? (
            <Image
              data={primary}
              alt={primary.altText || product.title}
              loading={loading}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}

          {secondary ? (
            <Image
              data={secondary}
              alt=""
              loading="lazy"
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100"
            />
          ) : null}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-2">
          <ProductBadge value={product.badge?.value} />
          <AllergenBadge allergens={product.allergens} />
        </div>

        <FavoriteButton
          productId={product.id}
          title={product.title}
          className="absolute right-3 top-3"
        />

        <div className={overlay}>
          {canQuickAdd && variant ? (
            <CartForm
              route="/cart"
              action={CartForm.ACTIONS.LinesAdd}
              inputs={{lines: [{merchandiseId: variant.id, quantity: 1}]}}
            >
              {(fetcher) => (
                <AddToBagGuard allergens={product.allergens}>
                  {({onClick, loading}) => (
                    <button
                      type="submit"
                      disabled={fetcher.state !== 'idle' || loading}
                      onClick={onClick}
                      className={`${buttonBase} bg-primary text-white hover:bg-ink disabled:opacity-60`}
                    >
                      {fetcher.state !== 'idle'
                        ? t('product.adding')
                        : t('product.addToBag')}
                    </button>
                  )}
                </AddToBagGuard>
              )}
            </CartForm>
          ) : (
            <Link
              to={url}
              prefetch="intent"
              className={`${buttonBase} bg-paper text-primary hover:bg-white`}
            >
              {hasMultipleVariants
                ? t('product.chooseOptions')
                : variant && !variant.availableForSale
                  ? t('product.soldOut')
                  : t('product.viewPiece')}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={url}
            prefetch="intent"
            className="block truncate font-display text-base leading-tight text-ink hover:text-primary"
          >
            {product.title}
          </Link>
        </div>

        <div className="shrink-0 text-sm text-ink">
          {isRange ? (
            <span className="mr-1 text-xs text-primary">
              {t('product.from')}
            </span>
          ) : null}
          <Money data={min} withoutTrailingZeros />
        </div>
      </div>

      {swatches.length > 0 && colorOption ? (
        <ul
          className="mt-3 flex flex-wrap items-center gap-2"
          aria-label={colorOption.name}
        >
          {swatches.slice(0, 6).map((value) => {
            const bg = value.swatch?.color ?? undefined;
            const img = value.swatch?.image?.previewImage?.url;
            const optionUrl = `${url}?${encodeURIComponent(colorOption.name)}=${encodeURIComponent(value.name)}`;
            const active =
              variantImage?.url === value.firstSelectableVariant?.image?.url;

            return (
              <li key={value.name}>
                <Link
                  to={optionUrl}
                  prefetch="intent"
                  aria-label={t('product.optionValue', {
                    option: colorOption.name,
                    value: value.name,
                  })}
                  title={value.name}
                  onMouseEnter={() =>
                    setVariantImage(value.firstSelectableVariant?.image ?? null)
                  }
                  onFocus={() =>
                    setVariantImage(value.firstSelectableVariant?.image ?? null)
                  }
                  onMouseLeave={() => setVariantImage(null)}
                  onBlur={() => setVariantImage(null)}
                  className={`block h-4 w-4 rounded-full border bg-cover bg-center ${
                    active
                      ? 'border-ink ring-1 ring-ink ring-offset-2'
                      : 'border-line'
                  }`}
                  style={{
                    backgroundColor: bg,
                    backgroundImage: img ? `url(${img})` : undefined,
                  }}
                />
              </li>
            );
          })}
          {swatches.length > 6 ? (
            <li className="text-[11px] text-primary">+{swatches.length - 6}</li>
          ) : null}
        </ul>
      ) : null}
    </article>
  );
}
