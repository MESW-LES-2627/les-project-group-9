import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue, Link} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {Icon} from '~/components/Icon';
import {useFavorites} from '~/lib/favorites';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

const navLinkClass = ({isActive, isPending}: {
  isActive: boolean;
  isPending: boolean;
}) =>
  `relative py-2 text-xs font-medium uppercase tracking-[0.12em] transition-opacity after:absolute after:inset-x-1/2 after:bottom-0 after:h-px after:bg-primary after:transition-[left,right] after:duration-300 hover:after:inset-x-0 ${
    isActive ? 'after:inset-x-0' : ''
  } ${isPending ? 'opacity-50' : 'opacity-100'}`;

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const {shop, menu} = header;

  return (
    <>
      <div className="flex h-6 items-center justify-center bg-primary px-4 text-center text-xs uppercase tracking-[0.16em] text-white">
        <span>Free shipping on orders over €100</span>
        <span className="hidden sm:inline"> · Made to last</span>
      </div>
      <header className="sticky top-0 z-50 grid h-[66px] grid-cols-[44px_1fr_auto] items-center border-b border-line bg-paper px-4 tablet:grid-cols-[minmax(140px,1fr)_auto_minmax(140px,1fr)] tablet:px-[3vw]">
        <div className="tablet:hidden">
          <HeaderMenuMobileToggle />
        </div>
        <NavLink
          aria-label={`${shop.name} — home`}
          className="justify-self-center font-display text-2xl font-medium tracking-[-0.04em] text-primary tablet:justify-self-start"
          prefetch="intent"
          to="/"
          end
        >
          {shop.name || 'Jeweliette'}
        </NavLink>
        <HeaderMenu
          menu={menu}
          viewport="desktop"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
        <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
      </header>
    </>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const {close} = useAside();
  const mobile = viewport === 'mobile';

  return (
    <nav
      aria-label={mobile ? 'Mobile menu' : 'Main navigation'}
      className={
        mobile
          ? 'flex flex-col gap-1 px-5 py-6'
          : 'hidden items-center justify-center gap-3 tablet:flex xl:gap-7'
      }
    >
      {mobile && (
        <NavLink
          className="flex min-h-14 items-center justify-between border-b border-line font-display text-3xl text-primary"
          end
          onClick={close}
          prefetch="intent"
          to="/"
        >
          <span><span className="mr-4 font-sans text-xs">01</span>Home</span>
          <Icon name="arrow" size={18} />
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item, index) => {
        if (!item.url) return null;
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;

        return (
          <NavLink
            className={mobile
              ? 'flex min-h-14 items-center justify-between border-b border-line font-display text-3xl text-primary'
              : navLinkClass
            }
            end
            key={item.id}
            onClick={close}
            prefetch="intent"
            to={url}
          >
            {mobile ? (
              <>
                <span>
                  <span className="mr-4 font-sans text-xs">
                    {String(index + 2).padStart(2, '0')}
                  </span>
                  {item.title}
                </span>
                <Icon name="arrow" size={18} />
              </>
            ) : item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <nav
      aria-label="Account actions"
      className="flex items-center justify-end gap-1 text-primary sm:gap-2"
    >
      <NavLink
        aria-label="Account"
        className="hidden size-11 place-items-center hover:text-ink tablet:grid"
        prefetch="intent"
        to="/account"
      >
        <Suspense fallback={<Icon name="user" />}>
          <Await resolve={isLoggedIn} errorElement={<Icon name="user" />}>
            {() => <Icon name="user" />}
          </Await>
        </Suspense>
      </NavLink>
      <SearchToggle />
      <CartToggle cart={cart} />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      aria-label="Open menu"
      className="grid size-11 place-items-center text-primary"
      onClick={() => open('mobile')}
      type="button"
    >
      <Icon name="menu" />
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button
      aria-label="Search"
      className="grid size-11 place-items-center hover:text-ink"
      onClick={() => open('search')}
      type="button"
    >
      <Icon name="search" />
    </button>
  );
}

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      aria-label={`Open cart with ${count} items`}
      className="relative grid size-11 place-items-center hover:text-ink"
      href="/cart"
      onClick={(event) => {
        event.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    >
      <Icon name="bag" />
      {count > 0 && (
        <span className="absolute right-0 top-0 grid size-[18px] place-items-center rounded-full bg-primary text-[11px] font-medium text-white">
          {count}
        </span>
      )}
    </a>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

const FALLBACK_HEADER_MENU = {
  id: 'fallback-header-menu',
  items: [
    {id: 'trending', resourceId: null, tags: [], title: 'Trending', type: 'HTTP', url: '/', items: []},
    {id: 'watches', resourceId: null, tags: [], title: 'Watches', type: 'HTTP', url: '/collections/watches', items: []},
    {id: 'charms', resourceId: null, tags: [], title: 'Charms', type: 'HTTP', url: '/collections/charms', items: []},
    {id: 'jewelry', resourceId: null, tags: [], title: 'Jewelry', type: 'HTTP', url: '/collections/jewelry', items: []},
    {id: 'custom', resourceId: null, tags: [], title: 'Custom', type: 'HTTP', url: '/collections/custom', items: []},
  ],
};

function FavoritesLink() {
  const {ids} = useFavorites();
  return (
    <Link
      to="/favorites"
      aria-label={`Favorites${ids.length ? ` (${ids.length})` : ''}`}
      className="relative flex h-10 w-10 items-center justify-center text-ink"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.8 5 6.2 5c2 0 3.5 1.1 4.3 2.4h3C14.3 6.1 15.8 5 17.8 5c3.4 0 5.3 3.4 3.8 6.8C19.5 16.4 12 21 12 21z" />
      </svg>
      {ids.length > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white">
          {ids.length}
        </span>
      ) : null}
    </Link>
  );
}