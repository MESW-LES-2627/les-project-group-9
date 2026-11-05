import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {Icon} from '~/components/Icon';
import {useAside} from '~/components/Aside';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
}: FooterProps) {
  const {open} = useAside();
  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer className="bg-ink px-[5vw] pb-8 pt-16 text-white sm:pt-20">
            <div className="grid gap-12 border-b border-white/15 pb-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_.7fr_.7fr_1.3fr] lg:gap-12">
              <div>
                <NavLink
                  className="font-display text-3xl tracking-[-0.04em]"
                  to="/"
                >
                  {header.shop.name || 'Jeweliette'}
                </NavLink>
                <p className="mt-5 max-w-[32ch] text-sm leading-7 text-white/65">
                  Joias modernas para combinar, oferecer e guardar.
                </p>
              </div>

              <div>
                <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-secondary">
                  Descobrir
                </p>
                <nav className="flex flex-col items-start gap-3 text-sm text-white/75">
                  <NavLink className="hover:text-white" to="/collections/all">Novidades</NavLink>
                  <NavLink className="hover:text-white" to="/collections/jewelry">Joias</NavLink>
                  <NavLink className="hover:text-white" to="/collections/custom">Personalização</NavLink>
                </nav>
              </div>

              <div>
                <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-secondary">
                  Informação
                </p>
                {footer?.menu && header.shop.primaryDomain?.url ? (
                  <FooterMenu
                    menu={footer.menu}
                    primaryDomainUrl={header.shop.primaryDomain.url}
                    publicStoreDomain={publicStoreDomain}
                  />
                ) : null}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-secondary">
                  Histórias na tua caixa de entrada
                </p>
                <p className="mt-4 text-sm leading-7 text-white/65">
                  Novidades, guias de estilo e acesso antecipado.
                </p>
                <div className="mt-7 flex border-b border-white/40 pb-2">
                  <input
                    aria-label="Endereço de email"
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45"
                    disabled
                    placeholder="Newsletter disponível em breve"
                    type="email"
                  />
                  <button
                    aria-label="Subscrever newsletter"
                    className="grid size-11 place-items-center text-secondary opacity-50"
                    disabled
                    type="button"
                  >
                    <Icon name="arrow" size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-6 text-xs uppercase tracking-[0.12em] text-white/45 sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} {header.shop.name || 'Jeweliette'}</span>
              <span>Designed to be kept</span>
            </div>
          </footer>
        )}
      </Await>
    </Suspense>
  );
}

function FooterMenu({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  menu: FooterQuery['menu'];
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
}) {
  return (
    <nav className="flex flex-col items-start gap-3 text-sm text-white/75">
      {(menu || FALLBACK_FOOTER_MENU).items.map((item) => {
        if (!item.url) return null;
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        if (url.startsWith('/') && url.split('?')[0] === '/search') {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => open('search')}
              className="hover:text-white"
            >
              Search
            </button>
          );
        }
        const isExternal = !url.startsWith('/');

        return isExternal ? (
          <a
            className="hover:text-white"
            href={url}
            key={item.id}
            rel="noopener noreferrer"
            target="_blank"
          >
            {item.title}
          </a>
        ) : (
          <NavLink
            className="hover:text-white"
            end
            key={item.id}
            prefetch="intent"
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

const FALLBACK_FOOTER_MENU = {
  id: 'fallback-footer-menu',
  items: [
    {id: 'privacy', resourceId: null, tags: [], title: 'Privacidade', type: 'SHOP_POLICY', url: '/policies/privacy-policy', items: []},
    {id: 'refund', resourceId: null, tags: [], title: 'Devoluções', type: 'SHOP_POLICY', url: '/policies/refund-policy', items: []},
    {id: 'shipping', resourceId: null, tags: [], title: 'Envios', type: 'SHOP_POLICY', url: '/policies/shipping-policy', items: []},
    {id: 'terms', resourceId: null, tags: [], title: 'Termos', type: 'SHOP_POLICY', url: '/policies/terms-of-service', items: []},
  ],
};
