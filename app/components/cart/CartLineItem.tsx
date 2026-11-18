import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/cart/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {ProductPrice} from '~/components/product/ProductPrice';
import {useAside} from '~/components/layout/Aside';
import {useTranslation} from '~/lib/i18n';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

export function CartLineItem({
                               layout,
                               line,
                               childrenMap,
                             }: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const t = useTranslation();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;

  const visibleOptions = selectedOptions.filter(
    (option) => !(option.name === 'Title' && option.value === 'Default Title'),
  );

  return (
    <li className="py-6">
      <div className="grid grid-cols-[96px_1fr] gap-5">
        <div className="aspect-square overflow-hidden bg-secondary">
          {image ? (
            <Image
              alt={image.altText || title}
              aspectRatio="1/1"
              data={image}
              height={192}
              width={192}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <Link
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => {
                if (layout === 'aside') close();
              }}
              className="font-display text-lg leading-tight text-ink hover:text-bark"
            >
              {product.title}
            </Link>

            <div className="shrink-0 text-sm text-ink">
              <ProductPrice price={line?.cost?.totalAmount} />
            </div>
          </div>

          {visibleOptions.length ? (
            <ul className="mt-2 space-y-1">
              {visibleOptions.map((option) => (
                <li
                  key={option.name}
                  className="text-xs uppercase tracking-wider text-primary"
                >
                  {option.name}: {option.value}
                </li>
              ))}
            </ul>
          ) : null}

          <CartLineQuantity line={line} />
        </div>
      </div>

      {lineItemChildren ? (
        <div className="mt-4 pl-[116px]">
          <p id={childrenLabelId} className="sr-only">
            {t('cart.lineChildren', {title: product.title})}
          </p>
          <ul
            aria-labelledby={childrenLabelId}
            className="divide-y divide-line"
          >
            {lineItemChildren.map((childLine) => (
              <CartLineItem
                childrenMap={childrenMap}
                key={childLine.id}
                line={childLine}
                layout={layout}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function CartLineQuantity({line}: {line: CartLine}) {
  const t = useTranslation();
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  const stepper =
    'flex h-11 w-11 items-center justify-center text-lg text-ink transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
      <div className="flex items-center border border-line">
        <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
          <button
            type="submit"
            aria-label={t('cart.decrease')}
            disabled={quantity <= 1 || !!isOptimistic}
            name="decrease-quantity"
            value={prevQuantity}
            className={stepper}
          >
            &#8722;
          </button>
        </CartLineUpdateButton>

        <span
          className="min-w-8 text-center text-sm tabular-nums"
          aria-live="polite"
        >
          {quantity}
        </span>

        <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
          <button
            type="submit"
            aria-label={t('cart.increase')}
            name="increase-quantity"
            value={nextQuantity}
            disabled={!!isOptimistic}
            className={stepper}
          >
            &#43;
          </button>
        </CartLineUpdateButton>
      </div>

      <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} />
    </div>
  );
}

function CartLineRemoveButton({
                                lineIds,
                                disabled,
                              }: {
  lineIds: string[];
  disabled: boolean;
}) {
  const t = useTranslation();
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button
        disabled={disabled}
        type="submit"
        className="min-h-11 text-xs uppercase tracking-widest text-primary underline underline-offset-4 transition-colors hover:text-bark disabled:opacity-40"
      >
        {t('common.remove')}
      </button>
    </CartForm>
  );
}

function CartLineUpdateButton({
                                children,
                                lines,
                              }: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}