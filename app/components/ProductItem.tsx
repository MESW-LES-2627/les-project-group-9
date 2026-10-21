import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';
import {Icon} from '~/components/Icon';

export function ProductItem({
  product,
  loading,
}: {
  product:
    | CollectionItemFragment
    | ProductItemFragment
    | RecommendedProductFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[0.82] overflow-hidden bg-secondary">
        <Link
          aria-label={`Ver ${product.title}`}
          className="block h-full w-full"
          prefetch="intent"
          to={variantUrl}
        >
          {image ? (
            <Image
              alt={image.altText || product.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              data={image}
              loading={loading}
              sizes="(min-width: 1280px) 25vw, (min-width: 800px) 33vw, 50vw"
            />
          ) : (
            <div
              aria-label={`Imagem de ${product.title} indisponível`}
              className="grid h-full place-items-center px-6 text-center text-xs uppercase tracking-[0.14em] text-primary/60"
              role="img"
            >
              Imagem indisponível
            </div>
          )}
        </Link>

        <button
          aria-label={`Guardar ${product.title} nos favoritos`}
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-paper/90 text-primary backdrop-blur-sm hover:bg-paper hover:text-ink"
          disabled
          title="Favoritos disponíveis numa fase posterior"
          type="button"
        >
          <Icon name="heart" size={19} />
        </button>

        <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0 group-focus-within:translate-y-0 tablet:flex">
          <Link
            className="flex min-h-12 flex-1 items-center justify-center bg-paper px-4 text-xs font-medium uppercase tracking-[0.13em] text-primary hover:bg-cream"
            prefetch="intent"
            to={variantUrl}
          >
            Ver detalhes
          </Link>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 pt-4">
        <div className="min-w-0">
          <Link prefetch="intent" to={variantUrl}>
            <h3 className="truncate font-display text-lg font-medium leading-tight text-ink">
              {product.title}
            </h3>
          </Link>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-primary">
            Jeweliette
          </p>
        </div>
        <p className="shrink-0 text-sm font-medium text-ink">
          <Money data={product.priceRange.minVariantPrice} />
        </p>
      </div>
    </article>
  );
}
