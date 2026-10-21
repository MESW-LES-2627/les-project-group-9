import {Link} from 'react-router';
import {CartForm, Image, Money} from '@shopify/hydrogen';
import type {CatalogProduct} from '~/lib/jeweliette-catalog';

type ProductItemProps = {
  product: CatalogProduct;
  loading?: 'eager' | 'lazy';
};

type CartResult = {
  errors?: Array<{
    message: string;
  }>;
};

export function ProductItem({
                              product,
                              loading = 'lazy',
                            }: ProductItemProps) {
  const productUrl = `/products/${product.handle}`;

  const minimumPrice = product.priceRange.minVariantPrice;
  const maximumPrice = product.priceRange.maxVariantPrice;

  const hasPriceRange =
    maximumPrice !== undefined &&
    minimumPrice.amount !== maximumPrice.amount;

  const material =
    product.material?.value || product.productType || null;

  const variants = product.variants?.nodes ?? [];
  const variant = variants.length === 1 ? variants[0] : null;
  const hasMultipleVariants = variants.length > 1;

  const canQuickAdd = variant?.availableForSale === true;

  return (
    <article className="group min-w-0">
      <div className="relative overflow-hidden bg-secondary">
        <Link
          to={productUrl}
          prefetch="intent"
          className="block aspect-[0.82] overflow-hidden"
          aria-label={`View ${product.title}`}
        >
          {product.featuredImage ? (
            <Image
              data={product.featuredImage}
              alt={product.featuredImage.altText || product.title}
              loading={loading}
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-primary">
              No image available
            </div>
          )}
        </Link>

        {product.badge?.value ? (
          <span className="pointer-events-none absolute left-3 top-3 bg-paper/95 px-3 py-2 text-xs uppercase tracking-widest text-primary">
            {product.badge.value}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={productUrl}
            prefetch="intent"
            className="font-display text-lg leading-tight text-ink hover:text-primary"
          >
            {product.title}
          </Link>

          {material ? (
            <p className="mt-2 text-xs uppercase tracking-wider text-primary">
              {material}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right text-sm text-ink">
          {hasPriceRange ? (
            <span className="mb-1 block text-xs text-primary">
              From
            </span>
          ) : null}

          <Money data={minimumPrice} />
        </div>
      </div>

      <div className="mt-5">
        {canQuickAdd && variant ? (
          <CartForm
            route="/cart"
            action={CartForm.ACTIONS.LinesAdd}
            inputs={{
              lines: [
                {
                  merchandiseId: variant.id,
                  quantity: 1,
                },
              ],
            }}
          >
            {(fetcher) => {
              const busy = fetcher.state !== 'idle';
              const result = fetcher.data as CartResult | undefined;

              return (
                <>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex min-h-11 w-full items-center justify-center bg-primary px-4 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-ink disabled:cursor-wait disabled:opacity-60"
                  >
                    {busy ? 'Adding…' : 'Add to bag'}
                  </button>

                  {result?.errors?.length ? (
                    <p
                      role="alert"
                      className="mt-3 text-sm text-red-800"
                    >
                      {result.errors
                        .map((error) => error.message)
                        .join(' ')}
                    </p>
                  ) : null}
                </>
              );
            }}
          </CartForm>
        ) : (
          <Link
            to={productUrl}
            prefetch="intent"
            className="flex min-h-11 w-full items-center justify-center border border-primary px-4 text-xs font-medium uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {hasMultipleVariants
              ? 'Choose options'
              : variant && !variant.availableForSale
                ? 'Sold out'
                : 'View piece'}
          </Link>
        )}
      </div>
    </article>
  );
}