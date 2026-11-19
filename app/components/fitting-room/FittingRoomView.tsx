import {Image} from '@shopify/hydrogen';
import {Money} from '~/components/shared/Money';
import type {CatalogImage, CatalogProduct} from '~/lib/jeweliette-catalog';
import {useTranslation} from '~/lib/i18n';

type FittingRoomViewProps = {
  products: CatalogProduct[];
  selectedIds: string[];
  movingId: string | null;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onMoveToCart: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
};

function productImage(product: CatalogProduct): CatalogImage | null {
  return product.featuredImage ?? product.images?.nodes[0] ?? null;
}

export function FittingRoomView({
  products,
  selectedIds,
  movingId,
  onToggle,
  onRemove,
  onMoveToCart,
  onSelectAll,
  onClear,
}: FittingRoomViewProps) {
  const t = useTranslation();
  const selected = products.filter((product) =>
    selectedIds.includes(product.id),
  );

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section
        aria-label={t('fittingRoom.listLabel')}
        className="lg:sticky lg:top-24 lg:h-[calc(100svh-190px)] lg:overflow-y-auto lg:pr-2"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
            {t('fittingRoom.count', {count: products.length})}
          </p>
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-primary">
            <button
              className="hover:text-bark"
              onClick={onSelectAll}
              type="button"
            >
              {t('fittingRoom.selectAll')}
            </button>
            <button className="hover:text-bark" onClick={onClear} type="button">
              {t('fittingRoom.clear')}
            </button>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {products.map((product) => {
            const image = productImage(product);
            const checked = selectedIds.includes(product.id);
            const variant = product.selectedOrFirstAvailableVariant;
            const available = variant?.availableForSale ?? false;
            const moving = movingId === product.id;

            return (
              <li key={product.id} className="py-4">
                <label
                  className={`flex cursor-pointer items-center gap-4 transition-opacity ${
                    checked ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <input
                    aria-label={t('fittingRoom.select', {title: product.title})}
                    checked={checked}
                    className="h-4 w-4 shrink-0 accent-ink"
                    onChange={() => onToggle(product.id)}
                    type="checkbox"
                  />
                  <span className="relative block h-20 w-16 shrink-0 overflow-hidden bg-secondary">
                    {image ? (
                      <Image
                        alt={image.altText || product.title}
                        className="h-full w-full object-cover"
                        data={image}
                        sizes="64px"
                        width={128}
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg text-ink">
                      {product.title}
                    </span>
                    <span className="mt-1 block text-sm text-primary">
                      <Money
                        data={product.priceRange.minVariantPrice}
                        withoutTrailingZeros
                      />
                    </span>
                  </span>
                </label>
                <div className="mt-3 flex items-center gap-4 pl-8 text-[11px] uppercase tracking-widest text-primary">
                  <button
                    type="button"
                    aria-label={t('product.fittingRoomRemove', {
                      title: product.title,
                    })}
                    disabled={movingId !== null}
                    onClick={() => onRemove(product.id)}
                    className="underline underline-offset-4 transition-colors hover:text-bark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('common.remove')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('fittingRoom.moveLabel', {
                      title: product.title,
                    })}
                    disabled={!available || movingId !== null}
                    onClick={() => onMoveToCart(product.id)}
                    className="underline underline-offset-4 transition-colors hover:text-bark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {moving
                      ? t('fittingRoom.moving')
                      : available
                        ? t('fittingRoom.moveToCart')
                        : t('product.soldOut')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <aside
        aria-label={t('fittingRoom.tryOn')}
        className="flex min-h-[420px] flex-col border border-dashed border-line bg-secondary/40 p-6 lg:sticky lg:top-24 lg:h-[calc(100svh-190px)]"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
            {t('fittingRoom.tryOn')}
          </p>
          <h2 className="mt-2 font-display text-2xl text-ink">
            {t('fittingRoom.tryOnTitle')}
          </h2>
          <p className="mt-2 max-w-[48ch] text-sm leading-7 text-primary">
            {t('fittingRoom.tryOnText')}
          </p>
        </div>

        <div className="mt-6 flex flex-1 items-center justify-center">
          {selected.length ? (
            <div className="text-center">
              <div className="mx-auto flex max-w-xs flex-wrap justify-center gap-2">
                {selected.map((product) => {
                  const image = productImage(product);
                  return image ? (
                    <Image
                      key={product.id}
                      alt={image.altText || product.title}
                      className="h-24 w-20 object-cover"
                      data={image}
                      sizes="80px"
                      width={160}
                    />
                  ) : null;
                })}
              </div>
              <p className="mt-4 text-sm text-primary">
                {t('fittingRoom.readyToTry', {count: selected.length})}
              </p>
            </div>
          ) : (
            <p className="max-w-[30ch] text-center text-sm text-primary">
              {t('fittingRoom.selectHint')}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
