import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue, Link} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/layout/Aside';
import {LanguageSelector} from '~/components/layout/LanguageSelector';
import {Icon} from '~/components/shared/Icon';
import {useFavorites} from '~/lib/favorites';
import {useFittingRoom} from '~/lib/fitting-room';
import {useTranslation} from '~/lib/i18n';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

const navLinkClass = ({
  isActive,
  isPending,
}: {
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
  const t = useTranslation();

  return (
    <>
      <div className="flex h-6 items-center justify-center bg-primary px-4 text-center text-xs uppercase tracking-[0.16em] text-white">
        <span>Free shipping on orders over €100</span>
        <span className="hidden sm:inline"> · Made to last</span>
      </div>
      <header className="sticky top-0 z-50 grid h-[66px] grid-cols-[44px_1fr_auto] items-center border-b border-line bg-paper px-4 xl:grid-cols-[minmax(140px,1fr)_auto_minmax(140px,1fr)] xl:px-[3vw]">
        <div className="xl:hidden">
          <HeaderMenuMobileToggle />
        </div>
        <NavLink
          aria-label={t('nav.homeOf', {shop: shop.name})}
          className="justify-self-center font-display text-2xl font-medium tracking-[-0.04em] text-primary xl:justify-self-start"
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
  const t = useTranslation();
  const mobile = viewport === 'mobile';

  return (
    <nav
      aria-label={mobile ? t('nav.mobile') : t('nav.main')}
      className={
        mobile
          ? 'flex flex-col gap-1 px-5 py-6'
          : 'hidden items-center justify-center gap-7 xl:flex'
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
          <span>
            <span className="mr-4 font-sans text-xs">01</span>
            {t('nav.home')}
          </span>
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
            className={
              mobile
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
            ) : (
              item.title
            )}
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
  const t = useTranslation();

  return (
    <nav
      aria-label={t('nav.accountActions')}
      className="flex items-center justify-end gap-1 text-primary sm:gap-2"
    >
      <LanguageSelector className="hidden xl:flex" />
      <SearchToggle />
      <FavoritesLink />
      <FittingRoomLink />

      <NavLink
        aria-label={t('nav.account')}
        className="hidden size-11 place-items-center hover:text-ink xl:grid"
        prefetch="intent"
        to="/account"
      >
        <Suspense fallback={<Icon name="user" />}>
          <Await resolve={isLoggedIn} errorElement={<Icon name="user" />}>
            {() => <Icon name="user" />}
          </Await>
        </Suspense>
      </NavLink>
      <CartToggle cart={cart} />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  const t = useTranslation();
  return (
    <button
      aria-label={t('nav.openMenu')}
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
  const t = useTranslation();
  return (
    <button
      aria-label={t('nav.search')}
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
  const t = useTranslation();

  return (
    <a
      aria-label={t('nav.openCart', {count})}
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
    {
      id: 'trending',
      resourceId: null,
      tags: [],
      title: 'Trending',
      type: 'HTTP',
      url: '/',
      items: [],
    },
    {
      id: 'watches',
      resourceId: null,
      tags: [],
      title: 'Watches',
      type: 'HTTP',
      url: '/collections/watches',
      items: [],
    },
    {
      id: 'charms',
      resourceId: null,
      tags: [],
      title: 'Charms',
      type: 'HTTP',
      url: '/collections/charms',
      items: [],
    },
    {
      id: 'jewelry',
      resourceId: null,
      tags: [],
      title: 'Jewelry',
      type: 'HTTP',
      url: '/collections/jewelry',
      items: [],
    },
    {
      id: 'collections',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
  ],
};

function FavoritesLink() {
  const {ids} = useFavorites();
  const t = useTranslation();
  return (
    <Link
      to="/favorites"
      aria-label={`${t('nav.favorites')}${ids.length ? ` (${ids.length})` : ''}`}
      className="relative flex h-10 w-10 items-center justify-center hover:text-ink"
    >
      <Icon name="heart" size={20} />
      {ids.length > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white">
          {ids.length}
        </span>
      ) : null}
    </Link>
  );
}

function FittingRoomLink() {
  const {ids} = useFittingRoom();
  const t = useTranslation();
  return (
    <Link
      to="/fitting-room"
      aria-label={`${t('nav.fittingRoom')}${ids.length ? ` (${ids.length})` : ''}`}
      className="relative flex h-10 w-10 items-center justify-center hover:text-ink"
    >
      <Icon name="hanger" size={20} />
      {ids.length > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white">
          {ids.length}
        </span>
      ) : null}
    </Link>
  );
}
