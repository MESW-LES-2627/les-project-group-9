import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router';
import {accountInput, accountButton, accountSecondaryButton,} from '~/lib/account-ui';
import type {Route} from './+types/account.orders._index';
import {useRef} from 'react';
import {
  Money,
  getPaginationVariables,
  flattenConnection,
} from '@shopify/hydrogen';
import {
  buildOrderSearchQuery,
  parseOrderFilters,
  ORDER_FILTER_FIELDS,
  type OrderFilterParams,
} from '~/lib/orderFilters';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'customer-accountapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';

type OrdersLoaderData = {
  customer: CustomerOrdersFragment;
  filters: OrderFilterParams;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Orders'}];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const url = new URL(request.url);
  const filters = parseOrderFilters(url.searchParams);
  const query = buildOrderSearchQuery(filters);

  const {data, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
      query,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return {customer: data.customer, filters};
}

export default function Orders() {
  const {customer, filters} = useLoaderData<OrdersLoaderData>();
  const {orders} = customer;

  return (
    <div className="space-y-8">
      <h2 className="font-display text-2xl">Your orders</h2>
      <OrderSearchForm currentFilters={filters} />
      <OrdersTable orders={orders} filters={filters} />
    </div>
  );
}

function OrdersTable({
  orders,
  filters,
}: {
  orders: CustomerOrdersFragment['orders'];
  filters: OrderFilterParams;
}) {
  const hasFilters = !!(filters.name || filters.confirmationNumber);

  return (
    <div className="acccount-orders" aria-live="polite">
      {orders?.nodes.length ? (
        <PaginatedResourceSection connection={orders}>
          {({node: order}) => <OrderItem key={order.id} order={order} />}
        </PaginatedResourceSection>
      ) : (
        <EmptyOrders hasFilters={hasFilters} />
      )}
    </div>
  );
}

function EmptyOrders({
                       hasFilters = false,
                     }: {
  hasFilters?: boolean;
}) {
  return (
    <div className="border-y border-line py-16 text-center">
      <h3 className="font-display text-2xl">
        {hasFilters
          ? 'No matching orders'
          : 'Your story starts here'}
      </h3>

      <p className="mt-4 text-sm text-primary">
        {hasFilters
          ? 'Try another order number or clear your filters.'
          : "You haven't placed any orders yet."}
      </p>

      <Link
        to={
          hasFilters
            ? '/account/orders'
            : '/collections/all'
        }
        className={`${accountSecondaryButton} mt-7`}
      >
        {hasFilters ? 'Clear filters' : 'Start shopping'}
      </Link>
    </div>
  );
}

function OrderSearchForm({
  currentFilters,
}: {
  currentFilters: OrderFilterParams;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSearching =
    navigation.state !== 'idle' &&
    navigation.location?.pathname?.includes('orders');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const name = formData.get(ORDER_FILTER_FIELDS.NAME)?.toString().trim();
    const confirmationNumber = formData
      .get(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER)
      ?.toString()
      .trim();

    if (name) params.set(ORDER_FILTER_FIELDS.NAME, name);
    if (confirmationNumber)
      params.set(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER, confirmationNumber);

    setSearchParams(params);
  };

  const hasFilters = currentFilters.name || currentFilters.confirmationNumber;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="border border-line bg-paper p-5 sm:p-6"
      aria-label="Search orders"
    >
      <fieldset className="space-y-4">
        <legend className="mb-4 text-xs uppercase tracking-widest text-primary">Filter Orders</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="search"
            name={ORDER_FILTER_FIELDS.NAME}
            placeholder="Order #"
            aria-label="Order number"
            defaultValue={currentFilters.name || ''}
            className={accountInput}
          />
          <input
            type="search"
            name={ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER}
            placeholder="Confirmation #"
            aria-label="Confirmation number"
            defaultValue={currentFilters.confirmationNumber || ''}
            className={accountInput}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className={accountButton} disabled={isSearching}>
            {isSearching ? 'Searching' : 'Search'}
          </button>
          {hasFilters && (
            <button
              type="button"
              className={accountSecondaryButton}
              disabled={isSearching}
              onClick={() => {
                setSearchParams(new URLSearchParams());
                formRef.current?.reset();
              }}
            >
              Clear
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}

function OrderItem({
                     order,
                   }: {
  order: OrderItemFragment;
}) {
  const fulfillmentStatus =
    flattenConnection(order.fulfillments)[0]?.status;

  const href = `/account/orders/${btoa(order.id)}`;

  return (
    <article className="mb-4 flex flex-wrap items-center justify-between gap-6 border border-line bg-paper p-6">
      <div>
        <Link
          to={href}
          className="font-display text-xl hover:text-primary"
        >
          Order #{order.number}
        </Link>

        <p className="mt-2 text-sm text-primary">
          {new Date(order.processedAt).toLocaleDateString(
            'en-GB',
            {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            },
          )}
        </p>

        <p className="mt-3 text-xs uppercase tracking-wider text-primary">
          {order.financialStatus}
          {fulfillmentStatus
            ? ` · ${fulfillmentStatus}`
            : ''}
        </p>
      </div>

      <div className="space-y-3 text-right">
        <Money data={order.totalPrice} />

        <Link
          to={href}
          className="block text-xs uppercase tracking-widest underline underline-offset-4"
        >
          View order
        </Link>
      </div>
    </article>
  );
}
