import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';

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

  const heading = customer
    ? customer.firstName
      ? `Welcome, ${customer.firstName}`
      : `Welcome to your account.`
    : 'Account Details';

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
      : 'border-transparent text-primary hover:text-ink'
  }`;

function AccountMenu() {
  return (
    <nav
      aria-label="Account"
      className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-4"
    >
      <NavLink to="/account/orders" className={accountLinkClass}>
        Orders
      </NavLink>
      <NavLink to="/account/profile" className={accountLinkClass}>
        Profile
      </NavLink>
      <NavLink to="/account/addresses" className={accountLinkClass}>
        Addresses
      </NavLink>
      <Logout />
    </nav>
  );
}

function Logout() {
  return (
    <Form method="POST" action="/account/logout">
      <button
        type="submit"
        className="min-h-11 text-xs uppercase tracking-[0.14em] text-primary transition-colors hover:text-ink"
      >
        Sign out
      </button>
    </Form>
  );
}
