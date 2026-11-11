import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router';
import {accountInput, accountButton, accountSecondaryButton,} from '~/lib/account-ui';
import type {Route} from './+types/account.orders._index';
import {useRef} from 'react';
import {formatDate, useLocale, useTranslation} from '~/lib/i18n';
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
import {PaginatedResourceSection} from '~/components/shared/PaginatedResourceSection';

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
  const t = useTranslation();

  return (
    <div className="space-y-8">
      <h2 className="font-display text-2xl">{t('orders.title')}</h2>
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
  const t = useTranslation();
  return (
    <div className="border-y border-line py-16 text-center">
      <h3 className="font-display text-2xl">
        {hasFilters
          ? t('orders.emptyFilteredTitle')
          : t('orders.emptyTitle')}
      </h3>

      <p className="mt-4 text-sm text-primary">
        {hasFilters
          ? t('orders.emptyFilteredText')
          : t('orders.emptyText')}
      </p>

      <Link
        to={
          hasFilters
            ? '/account/orders'
            : '/collections/all'
        }
        className={`${accountSecondaryButton} mt-7`}
      >
        {hasFilters ? t('filters.clear') : t('orders.startShopping')}
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
  const t = useTranslation();
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
      aria-label={t('orders.search')}
    >
      <fieldset className="space-y-4">
        <legend className="mb-4 text-xs uppercase tracking-widest text-primary">{t('orders.filter')}</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="search"
            name={ORDER_FILTER_FIELDS.NAME}
            placeholder={t('orders.numberPlaceholder')}
            aria-label={t('orders.numberLabel')}
            defaultValue={currentFilters.name || ''}
            className={accountInput}
          />
          <input
            type="search"
            name={ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER}
            placeholder={t('orders.confirmationPlaceholder')}
            aria-label={t('orders.confirmationLabel')}
            defaultValue={currentFilters.confirmationNumber || ''}
            className={accountInput}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className={accountButton} disabled={isSearching}>
            {isSearching ? t('orders.searching') : t('nav.search')}
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
              {t('common.clear')}
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
  const t = useTranslation();
  const {tag} = useLocale();

  const href = `/account/orders/${btoa(order.id)}`;

  return (
    <article className="mb-4 flex flex-wrap items-center justify-between gap-6 border border-line bg-paper p-6">
      <div>
        <Link
          to={href}
          className="font-display text-xl hover:text-primary"
        >
          {t('orders.orderNumber', {number: order.number})}
        </Link>

        <p className="mt-2 text-sm text-primary">
          {formatDate(order.processedAt, tag)}
        </p>

        <p className="mt-3 text-xs uppercase tracking-wider text-primary">
          {order.financialStatus
            ? t(`order.financial.${order.financialStatus}`)
            : null}
          {fulfillmentStatus
            ? ` · ${t(`order.fulfillment.${fulfillmentStatus}`)}`
            : ''}
        </p>
      </div>

      <div className="space-y-3 text-right">
        <Money data={order.totalPrice} />

        <Link
          to={href}
          className="block text-xs uppercase tracking-widest underline underline-offset-4"
        >
          {t('orders.view')}
        </Link>
      </div>
    </article>
  );
}
