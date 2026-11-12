import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/cart/CartMain';
import {CartForm, type OptimisticCart} from '@shopify/hydrogen';
import {Money} from '~/components/shared/Money';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {useTranslation} from '~/lib/i18n';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

const inputClass =
  'min-h-10 min-w-0 flex-1 border border-line bg-paper px-3 text-base text-ink placeholder:text-primary/60 focus:border-primary focus:outline-none';

const secondaryButtonClass =
  'min-h-10 shrink-0 border border-primary px-4 text-xs font-medium uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white';

export function CartSummary({cart, layout}: CartSummaryProps) {
  const summaryId = useId();
  const discountCodeInputId = useId();
  const giftCardInputId = useId();
  const t = useTranslation();

  const hasAppliedDiscounts = Boolean(
    cart?.discountCodes?.some((discount) => discount.applicable),
  );
  const hasAppliedGiftCards = Boolean(cart?.appliedGiftCards?.length);

  const wrapperClass =
    layout === 'page'
      ? 'sticky bottom-0 mt-8 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur-md md:ml-auto md:w-full md:max-w-sm md:border md:px-5'
      : 'sticky bottom-0 mt-auto border-t border-line bg-paper px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgb(70_45_43/8%)]';

  return (
    <section aria-labelledby={summaryId} className={wrapperClass}>
      <h4 id={summaryId} className="sr-only">
        {t('cart.summary')}
      </h4>

      <CartAppliedCodes
        discountCodes={cart?.discountCodes}
        giftCardCodes={cart?.appliedGiftCards}
      />

      <details
        className="group border-b border-line"
        open={hasAppliedDiscounts || hasAppliedGiftCards ? undefined : false}
      >
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-xs uppercase tracking-widest text-primary [&::-webkit-details-marker]:hidden">
          {t('cart.addCode')}
          <span
            aria-hidden="true"
            className="text-base transition-transform group-open:rotate-45"
          >
            +
          </span>
        </summary>

        <div className="space-y-3 pb-3 pt-1">
          <CartDiscountForm
            discountCodes={cart?.discountCodes}
            inputId={discountCodeInputId}
          />
          <CartGiftCardForm inputId={giftCardInputId} />
        </div>
      </details>

      <dl className="flex items-baseline justify-between pt-3">
        <dt className="text-xs uppercase tracking-widest text-primary">
          {t('cart.subtotal')}
        </dt>
        <dd className="font-display text-xl text-ink">
          {cart?.cost?.subtotalAmount?.amount ? (
            <Money data={cart.cost.subtotalAmount} />
          ) : (
            '-'
          )}
        </dd>
      </dl>

      <p className="mt-1 text-xs text-primary">
        {t('cart.taxesNote')}
      </p>

      <CartCheckoutActions checkoutUrl={cart?.checkoutUrl} />
    </section>
  );
}

function CartCheckoutActions({checkoutUrl}: {checkoutUrl?: string}) {
  const t = useTranslation();
  if (!checkoutUrl) return null;

  return (
    <a
      href={checkoutUrl}
      target="_self"
      className="mt-3 flex min-h-11 w-full items-center justify-between bg-primary px-5 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-ink"
    >
      {t('cart.checkout')}
      <span aria-hidden="true">→</span>
    </a>
  );
}

function CartAppliedCodes({
                            discountCodes,
                            giftCardCodes,
                          }: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  giftCardCodes?: CartApiQueryFragment['appliedGiftCards'];
}) {
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  const t = useTranslation();
  const removeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const previousCardIdsRef = useRef<string[]>([]);
  const [removedCardIndex, setRemovedCardIndex] = useState<number | null>(null);

  useEffect(() => {
    const currentCardIds = giftCardCodes?.map((card) => card.id) || [];

    if (removedCardIndex !== null && giftCardCodes) {
      const target =
        giftCardCodes[Math.min(removedCardIndex, giftCardCodes.length - 1)];
      removeButtonRefs.current.get(target?.id ?? '')?.focus();
      setRemovedCardIndex(null);
    }

    previousCardIdsRef.current = currentCardIds;
  }, [giftCardCodes, removedCardIndex]);

  if (!codes.length && !giftCardCodes?.length) return null;

  return (
    <ul className="mb-2 flex flex-wrap gap-2" aria-label={t('cart.appliedCodes')}>
      {codes.length > 0 && (
        <li className="flex items-center gap-2 bg-secondary/60 py-1 pl-3 pr-1 text-xs text-ink">
          <span>{codes.join(', ')}</span>
          <UpdateDiscountForm discountCodes={[]}>
            <button
              type="submit"
              aria-label={t('cart.removeDiscount')}
              className="min-h-8 px-2 text-primary underline underline-offset-2"
            >
              {t('common.remove')}
            </button>
          </UpdateDiscountForm>
        </li>
      )}

      {giftCardCodes?.map((giftCard) => (
        <li
          key={giftCard.id}
          className="flex items-center gap-2 bg-secondary/60 py-1 pl-3 pr-1 text-xs text-ink"
        >
          <span>{t('cart.giftCard', {last: giftCard.lastCharacters})}</span>
          <CartForm
            route="/cart"
            action={CartForm.ACTIONS.GiftCardCodesRemove}
            inputs={{giftCardCodes: [giftCard.id]}}
          >
            <button
              type="submit"
              aria-label={t('cart.removeGiftCard', {
                last: giftCard.lastCharacters,
              })}
              ref={(el) => {
                if (el) removeButtonRefs.current.set(giftCard.id, el);
                else removeButtonRefs.current.delete(giftCard.id);
              }}
              onClick={() => {
                const index = previousCardIdsRef.current.indexOf(giftCard.id);
                if (index !== -1) setRemovedCardIndex(index);
              }}
              className="min-h-8 px-2 text-primary underline underline-offset-2"
            >
              {t('common.remove')}
            </button>
          </CartForm>
        </li>
      ))}
    </ul>
  );
}

function CartDiscountForm({
                            discountCodes,
                            inputId,
                          }: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  inputId: string;
}) {
  const t = useTranslation();
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <UpdateDiscountForm discountCodes={codes}>
      <label htmlFor={inputId} className="sr-only">
        {t('cart.discountCode')}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          name="discountCode"
          placeholder={t('cart.discountCode')}
          autoComplete="off"
          className={inputClass}
        />
        <button type="submit" className={secondaryButtonClass}>
          {t('cart.apply')}
        </button>
      </div>
    </UpdateDiscountForm>
  );
}

function UpdateDiscountForm({
                              discountCodes,
                              children,
                            }: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{discountCodes: discountCodes || []}}
    >
      {children}
    </CartForm>
  );
}

function CartGiftCardForm({inputId}: {inputId: string}) {
  const giftCardCodeInput = useRef<HTMLInputElement>(null);
  const giftCardAddFetcher = useFetcher({key: 'gift-card-add'});
  const t = useTranslation();

  useEffect(() => {
    if (giftCardAddFetcher.data && giftCardCodeInput.current !== null) {
      giftCardCodeInput.current.value = '';
    }
  }, [giftCardAddFetcher.data]);

  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesAdd}
      fetcherKey="gift-card-add"
    >
      <label htmlFor={inputId} className="sr-only">
        {t('cart.giftCardCode')}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          name="giftCardCode"
          placeholder={t('cart.giftCardCode')}
          autoComplete="off"
          ref={giftCardCodeInput}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={giftCardAddFetcher.state !== 'idle'}
          className={`${secondaryButtonClass} disabled:cursor-wait disabled:opacity-60`}
        >
          {t('cart.apply')}
        </button>
      </div>
    </CartForm>
  );
}