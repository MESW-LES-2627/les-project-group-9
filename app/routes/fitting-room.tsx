import {useEffect, useRef, useState} from 'react';
import {data, Link, useFetcher} from 'react-router';
import type {Route} from './+types/fitting-room';
import {translatorFor, translatorFromMatches, useTranslation} from '~/lib/i18n';
import {FittingRoomView} from '~/components/fitting-room/FittingRoomView';
import {useFittingRoom} from '~/lib/fitting-room';
import {updateCustomerFittingRoom} from '~/lib/profile/customer.server';
import {
  MAX_FITTING_ROOM,
  type FittingRoomPiece,
} from '~/lib/profile/fitting-room';
import {isVariantGid} from '~/lib/profile/list-schema';
import {resolveTryOn} from '~/lib/try-on/catalog';
import {isMobileRequest} from '~/lib/try-on/device';
import {loadVariantsByIds} from '~/lib/variants.server';
import {parseVariantIds} from '~/lib/variants';

export const meta: Route.MetaFunction = ({matches}) => [
  {title: `${translatorFromMatches(matches)('nav.fittingRoom')} | Jeweliette`},
  {name: 'robots', content: 'noindex'},
];

export async function loader({request, context}: Route.LoaderArgs) {
  const ids = parseVariantIds(
    new URL(request.url).searchParams.get('ids'),
    MAX_FITTING_ROOM,
  );
  const variants = await loadVariantsByIds(context, ids);

  const pieces: FittingRoomPiece[] = variants.map((variant) => ({
    variantId: variant.id,
    product: variant.product,
    image: variant.image ?? variant.product.featuredImage ?? null,
    variantTitle: variant.title,
    price: variant.price,
    available: variant.availableForSale,
    tryOn: resolveTryOn(variant.product, variant),
  }));
  // Stale entries (overlay removed, category changed) are pruned by the
  // profile endpoint; keeping them here lets the view mark them "No 3D".

  return {pieces, isMobile: isMobileRequest(request)};
}

export async function action({request, context}: Route.ActionArgs) {
  // Messages are shown on the page, so they are translated here.
  const t = translatorFor(context.storefront.i18n);
  const loggedIn = await context.customerAccount.isLoggedIn();
  if (!loggedIn) {
    return data({error: t('fittingRoom.error.unauthorized')}, {status: 401});
  }

  const formData = await request.formData();
  const variantId = formData.get('variantId');

  if (typeof variantId !== 'string' || !isVariantGid(variantId)) {
    return data({error: t('fittingRoom.error.invalid')}, {status: 400});
  }

  const [variant] = await loadVariantsByIds(context, [variantId]);

  if (!variant?.availableForSale) {
    return data({error: t('fittingRoom.error.soldOut')}, {status: 400});
  }

  try {
    const result = await context.cart.addLines([
      {merchandiseId: variant.id, quantity: 1},
    ]);

    const cartError =
      result.errors?.[0]?.message ?? result.userErrors?.[0]?.message;

    if (cartError) {
      return data({error: cartError}, {status: 400});
    }

    const headers = result.cart?.id
      ? context.cart.setCartId(result.cart.id)
      : new Headers();

    try {
      const fittingRoom = await updateCustomerFittingRoom(context, {
        remove: [variantId],
      });
      return data({fittingRoom, cart: result.cart}, {headers});
    } catch (error) {
      // Internal messages are not localized: log them, show a translated one.
      console.error('Could not update the fitting room', error);
      return data(
        {error: t('fittingRoom.error.remove')},
        {status: 400, headers},
      );
    }
  } catch (error) {
    console.error('Could not move the piece to the cart', error);
    return data({error: t('fittingRoom.error.move')}, {status: 400});
  }
}

export default function FittingRoom() {
  const {
    ids,
    ready,
    isLoggedIn,
    toggle: toggleFittingRoom,
    setIds,
  } = useFittingRoom();
  const t = useTranslation();
  const fetcher = useFetcher<typeof loader>();
  const moveFetcher = useFetcher<typeof action>();
  const key = ids.join(',');
  const [selected, setSelected] = useState<string[]>([]);
  const handledMove = useRef<unknown>(null);
  const handledLookLink = useRef(false);
  const movingId =
    (moveFetcher.formData?.get('variantId') as string | null) ?? null;

  useEffect(() => {
    if (key) {
      void fetcher.load(`/fitting-room?ids=${encodeURIComponent(key)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const currentIds = key ? key.split(',') : [];

    // Selections are explicit: drop pieces that left the room, but never
    // select anything automatically.
    setSelected((current) => current.filter((id) => currentIds.includes(id)));
  }, [key]);

  // A QR link carries the desktop look's variant ids: select them on the phone
  // so the launcher can open the same pieces.
  useEffect(() => {
    if (handledLookLink.current || !ids.length) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('tryOn') !== '1') {
      handledLookLink.current = true;
      return;
    }

    const linked = parseVariantIds(params.get('ids'), MAX_FITTING_ROOM).filter(
      (id) => ids.includes(id),
    );

    if (linked.length) setSelected(linked);
    handledLookLink.current = true;
  }, [ids]);

  const pieces = (fetcher.data?.pieces ?? []).filter((piece) =>
    ids.includes(piece.variantId),
  );

  const toggleSelected = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const moveToCart = (id: string) => {
    void moveFetcher.submit({variantId: id}, {method: 'post'});
  };

  useEffect(() => {
    if (moveFetcher.state !== 'idle' || !moveFetcher.data) {
      return;
    }
    if (handledMove.current === moveFetcher.data) return;

    handledMove.current = moveFetcher.data;

    if ('error' in moveFetcher.data) return;
    if (moveFetcher.data.fittingRoom) {
      setIds(moveFetcher.data.fittingRoom);
    }
  }, [moveFetcher.state, moveFetcher.data, setIds]);

  const moveError =
    moveFetcher.data && 'error' in moveFetcher.data
      ? moveFetcher.data.error
      : null;

  return (
    <section className="mx-auto max-w-[1500px] px-[4vw] pb-20 pt-10 tablet:pt-14">
      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
          {t('common.yourSelection')}
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-none">
          {t('nav.fittingRoom')}
        </h1>
      </header>

      {!ready ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center text-sm text-primary">
          {t('fittingRoom.loading')}
        </div>
      ) : !isLoggedIn ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center">
          <h2 className="font-display text-2xl">
            {t('fittingRoom.loginTitle')}
          </h2>
          <p className="mt-3 text-sm text-primary">
            {t('fittingRoom.loginText')}
          </p>
          <Link
            to="/account/login"
            className="mt-6 inline-flex min-h-11 items-center bg-primary px-6 text-[11px] uppercase tracking-widest text-white hover:bg-bark"
          >
            {t('common.logIn')}
          </Link>
        </div>
      ) : ids.length === 0 ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center">
          <h2 className="font-display text-2xl">
            {t('fittingRoom.emptyTitle')}
          </h2>
          <p className="mt-3 text-sm text-primary">
            {t('fittingRoom.emptyText')}
          </p>
          <Link
            to="/collections/all"
            className="mt-6 inline-flex min-h-11 items-center bg-primary px-6 text-[11px] uppercase tracking-widest text-white hover:bg-bark"
          >
            {t('home.exploreCollection')}
          </Link>
        </div>
      ) : !fetcher.data ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center text-sm text-primary">
          {t('fittingRoom.loadingPieces')}
        </div>
      ) : pieces.length === 0 ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center">
          <h2 className="font-display text-2xl">
            {t('fittingRoom.unavailableTitle')}
          </h2>
          <p className="mt-3 text-sm text-primary">
            {t('fittingRoom.unavailableText')}
          </p>
        </div>
      ) : (
        <>
          {moveError ? (
            <p role="alert" className="mt-6 text-sm text-red-700">
              {moveError}
            </p>
          ) : null}
          <FittingRoomView
            isMobile={fetcher.data.isMobile}
            movingId={movingId}
            onClear={() => setSelected([])}
            onMoveToCart={moveToCart}
            onRemove={toggleFittingRoom}
            onSelectAll={() =>
              setSelected(
                pieces
                  .filter((piece) => piece.tryOn !== null)
                  .map((piece) => piece.variantId),
              )
            }
            onToggle={toggleSelected}
            pieces={pieces}
            selectedIds={selected}
          />
        </>
      )}
    </section>
  );
}
