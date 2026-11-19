import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import {useTranslation} from '~/lib/i18n';

export function shouldRevalidate() {
  return true;
}

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return remixData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();
  const t = useTranslation();

  const heading = customer
    ? customer.firstName
      ? t('account.welcomeName', {name: customer.firstName})
      : t('account.welcome')
    : t('account.details');

  return (
    <div className="mx-auto max-w-[1100px] px-[4vw] py-12">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-none text-ink">
        {heading}
      </h1>

      <AccountMenu />

      <div className="mt-10">
        <Outlet context={{customer}} />
      </div>
    </div>
  );
}

const accountLinkClass = ({isActive,}: { isActive: boolean; }) => `inline-flex min-h-11 items-center border-b-2 text-xs uppercase tracking-[0.14em] transition-colors ${
    isActive
      ? 'border-primary text-ink'
      : 'border-transparent text-primary hover:text-bark'
  }`;

function AccountMenu() {
  const t = useTranslation();
  return (
    <nav
      aria-label={t('nav.account')}
      className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-4"
    >
      <NavLink to="/account/orders" className={accountLinkClass}>
        {t('account.orders')}
      </NavLink>
      <NavLink to="/account/profile" className={accountLinkClass}>
        {t('account.profile')}
      </NavLink>
      <NavLink to="/account/addresses" className={accountLinkClass}>
        {t('account.addresses')}
      </NavLink>
      <Logout />
    </nav>
  );
}

function Logout() {
  const t = useTranslation();
  return (
    <Form method="POST" action="/account/logout">
      <button
        type="submit"
        className="min-h-11 text-xs uppercase tracking-[0.14em] text-primary transition-colors hover:text-bark"
      >
        {t('account.signOut')}
      </button>
    </Form>
  );
}
