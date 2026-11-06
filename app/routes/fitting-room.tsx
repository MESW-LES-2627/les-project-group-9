import {useEffect, useState} from 'react';
import {Link, useFetcher} from 'react-router';
import type {Route} from './+types/fitting-room';
import {FittingRoomView} from '~/components/fitting-room/FittingRoomView';
import {useFittingRoom} from '~/lib/fitting-room';
import {MAX_FITTING_ROOM} from '~/lib/profile/fitting-room';
import {loadProductsByIds, parseProductIds} from '~/lib/products.server';

export const meta: Route.MetaFunction = () => [
  {title: 'Fitting room | Jeweliette'},
  {name: 'robots', content: 'noindex'},
];

export async function loader({request, context}: Route.LoaderArgs) {
  const ids = parseProductIds(
    new URL(request.url).searchParams.get('ids'),
    MAX_FITTING_ROOM,
  );
  const products = await loadProductsByIds(context, ids);
  return {products};
}

export default function FittingRoom() {
  const {ids, ready, isLoggedIn} = useFittingRoom();
  const fetcher = useFetcher<typeof loader>();
  const key = ids.join(',');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (key) {
      void fetcher.load(`/fitting-room?ids=${encodeURIComponent(key)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const currentIds = key ? key.split(',') : [];

    setSelected((current) =>
      Array.from(
        new Set([
          ...current.filter((id) => currentIds.includes(id)),
          ...currentIds,
        ]),
      ),
    );
  }, [key]);

  const products = (fetcher.data?.products ?? []).filter((product) =>
    ids.includes(product.id),
  );

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <section className="mx-auto max-w-[1500px] px-[4vw] pb-20 pt-10 tablet:pt-14">
      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
          Your selection
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-none">
          Fitting room
        </h1>
      </header>

      {!ready ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center text-sm text-primary">
          Loading your fitting room…
        </div>
      ) : !isLoggedIn ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center">
          <h2 className="font-display text-2xl">
            Log in to use the fitting room.
          </h2>
          <p className="mt-3 text-sm text-primary">
            Sign in to keep the pieces you want to try across devices.
          </p>
          <Link
            to="/account/login"
            className="mt-6 inline-flex min-h-11 items-center bg-primary px-6 text-[11px] uppercase tracking-widest text-white hover:bg-ink"
          >
            Log in
          </Link>
        </div>
      ) : ids.length === 0 ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center">
          <h2 className="font-display text-2xl">Your fitting room is empty.</h2>
          <p className="mt-3 text-sm text-primary">
            Use the hanger button on any piece to add it here.
          </p>
          <Link
            to="/collections/all"
            className="mt-6 inline-flex min-h-11 items-center bg-primary px-6 text-[11px] uppercase tracking-widest text-white hover:bg-ink"
          >
            Explore the collection
          </Link>
        </div>
      ) : !fetcher.data ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center text-sm text-primary">
          Loading pieces…
        </div>
      ) : products.length === 0 ? (
        <div className="mx-auto mt-14 max-w-md border-y border-line py-14 text-center">
          <h2 className="font-display text-2xl">
            These pieces are unavailable.
          </h2>
          <p className="mt-3 text-sm text-primary">
            They may have been removed from the store.
          </p>
        </div>
      ) : (
        <FittingRoomView
          onClear={() => setSelected([])}
          onSelectAll={() => setSelected(ids)}
          onToggle={toggle}
          products={products}
          selectedIds={selected}
        />
      )}
    </section>
  );
}
