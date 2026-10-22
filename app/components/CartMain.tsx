import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

export type LineItemChildrenMap = {[parentId: string]: CartLine[]};

function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const lineChildren = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(lineChildren)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}

export function CartMain({layout, cart: originalCart}: CartMainProps) {
  const cart = useOptimisticCart(originalCart);

  const hasLines = Boolean(cart?.lines?.nodes?.length);
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);

  return (
    <section
      aria-label={layout === 'page' ? 'Cart page' : 'Cart drawer'}
      className={
        layout === 'page'
          ? 'mx-auto w-full max-w-3xl px-[5vw] py-16'
          : 'flex h-full flex-col'
      }
    >
      {!hasLines ? <CartEmpty /> : null}

      {hasLines ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <p id="cart-lines" className="sr-only">
            Line items
          </p>

          <ul
            aria-labelledby="cart-lines"
            className="flex-1 divide-y divide-line"
          >
            {(cart?.lines?.nodes ?? []).map((line) => {
              if (
                'parentRelationship' in line &&
                line.parentRelationship?.parent
              ) {
                return null;
              }
              return (
                <CartLineItem
                  key={line.id}
                  line={line}
                  layout={layout}
                  childrenMap={childrenMap}
                />
              );
            })}
          </ul>

          {cartHasItems ? <CartSummary cart={cart} layout={layout} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function CartEmpty() {
  const {close} = useAside();

  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h2 className="font-display text-3xl leading-tight text-ink">
        Your bag is empty
      </h2>
      <p className="max-w-[32ch] text-sm leading-6 text-primary">
        Looks like you haven&rsquo;t added anything yet. Explore the
        collections and find a piece you love.
      </p>
      <Link
        to="/collections"
        onClick={close}
        prefetch="viewport"
        className="inline-flex min-h-11 items-center bg-primary px-6 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-ink"
      >
        Continue shopping
      </Link>
    </div>
  );
}