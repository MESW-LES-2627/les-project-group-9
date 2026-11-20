import {Suspense} from 'react';
import {Await, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/account.orders.$id';
import {Image} from '@shopify/hydrogen';
import {Money} from '~/components/shared/Money';
import type {
  OrderLineItemFullFragment,
  OrderQuery,
} from 'customer-accountapi.generated';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
import {accountOrderDetail} from '~/lib/account-ui';
import {
  OrderRatings,
  OrderRatingsLoading,
} from '~/components/account/OrderRatings';
import {NO_STORE} from '~/lib/profile/operation.server';
import {createRatingStore} from '~/lib/ratings/rating-store.server';
import {
  loadOrderRatings,
  type OrderRatingsView,
} from '~/lib/ratings/ratings.server';
import {
  formatDate,
  translatorFromMatches,
  useLocale,
  useTranslation,
} from '~/lib/i18n';

export const meta: Route.MetaFunction = ({data, matches}) => {
  const t = translatorFromMatches(matches);
  return [
    {
      title: `${t('order.title', {name: data?.order?.name ?? ''})} | Jeweliette`,
    },
  ];
};

/** Order details and ratings are specific to the signed-in customer. */
export const headers: Route.HeadersFunction = () => NO_STORE;

export async function loader({params, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  if (!params.id) {
    return redirect('/account/orders');
  }

  const orderId = atob(params.id);
  const {data, errors}: {data: OrderQuery; errors?: Array<{message: string}>} =
    await customerAccount.query(CUSTOMER_ORDER_QUERY, {
      variables: {
        orderId,
        language: customerAccount.i18n.language,
      },
    });

  if (errors?.length || !data?.order) {
    throw new Error('Order not found');
  }

  const {order} = data;

  // Extract line items directly from nodes array
  const lineItems = order.lineItems.nodes;

  // Extract discount applications directly from nodes array
  const discountApplications = order.discountApplications.nodes;

  // Get fulfillment status from first fulfillment node
  const fulfillmentStatus = order.fulfillments.nodes[0]?.status ?? null;

  // Get first discount value with proper type checking
  const firstDiscount = discountApplications[0]?.value;

  // Type guard for MoneyV2 discount
  const discountValue =
    firstDiscount?.__typename === 'MoneyV2'
      ? (firstDiscount as Extract<
          typeof firstDiscount,
          {__typename: 'MoneyV2'}
        >)
      : null;

  // Type guard for percentage discount
  const discountPercentage =
    firstDiscount?.__typename === 'PricingPercentageValue'
      ? (
          firstDiscount as Extract<
            typeof firstDiscount,
            {__typename: 'PricingPercentageValue'}
          >
        ).percentage
      : null;

  // Not awaited: the order renders while delivery and saved ratings load.
  const ratings: Promise<OrderRatingsView> = loadOrderRatings({
    customerAccount,
    store: createRatingStore(context.env),
    orderId: order.id,
  }).catch((error: unknown) => {
    console.error(
      '[ratings] unexpected error:',
      error instanceof Error ? error.name : 'unknown',
    );
    return {status: 'load_error'};
  });

  return {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
    ratings,
  };
}

export default function OrderRoute() {
  const {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
    ratings,
  } = useLoaderData<typeof loader>();
  const t = useTranslation();
  const {tag} = useLocale();
  return (
    <div className={accountOrderDetail}>
      <h2>{t('order.title', {name: order.name})}</h2>
      <p>{t('order.placedOn', {date: formatDate(order.processedAt, tag)})}</p>
      {order.confirmationNumber && (
        <p>{t('order.confirmation', {number: order.confirmationNumber})}</p>
      )}
      <br />
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th scope="col">{t('order.product')}</th>
              <th scope="col">{t('product.price')}</th>
              <th scope="col">{t('order.quantity')}</th>
              <th scope="col">{t('order.total')}</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((lineItem, lineItemIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <OrderLineRow key={lineItemIndex} lineItem={lineItem} />
            ))}
          </tbody>
          <tfoot>
            {((discountValue && discountValue.amount) ||
              discountPercentage) && (
              <tr>
                <th scope="row" colSpan={3}>
                  <p>{t('order.discounts')}</p>
                </th>
                <th scope="row">
                  <p>{t('order.discounts')}</p>
                </th>
                <td>
                  {discountPercentage ? (
                    <span>
                      {t('order.percentOff', {percent: discountPercentage})}
                    </span>
                  ) : (
                    discountValue && <Money data={discountValue!} />
                  )}
                </td>
              </tr>
            )}
            <tr>
              <th scope="row" colSpan={3}>
                <p>{t('cart.subtotal')}</p>
              </th>
              <th scope="row">
                <p>{t('cart.subtotal')}</p>
              </th>
              <td>
                <Money data={order.subtotal!} />
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>
                {t('order.tax')}
              </th>
              <th scope="row">
                <p>{t('order.tax')}</p>
              </th>
              <td>
                <Money data={order.totalTax!} />
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>
                {t('order.total')}
              </th>
              <th scope="row">
                <p>{t('order.total')}</p>
              </th>
              <td>
                <Money data={order.totalPrice!} />
              </td>
            </tr>
          </tfoot>
        </table>
        <div>
          <h3>{t('order.shippingAddress')}</h3>
          {order?.shippingAddress ? (
            <address>
              <p>{order.shippingAddress.name}</p>
              {order.shippingAddress.formatted ? (
                <p>{order.shippingAddress.formatted}</p>
              ) : (
                ''
              )}
              {order.shippingAddress.formattedArea ? (
                <p>{order.shippingAddress.formattedArea}</p>
              ) : (
                ''
              )}
            </address>
          ) : (
            <p>{t('order.noShippingAddress')}</p>
          )}
          <h3>{t('order.status')}</h3>
          <div>
            <p>
              {fulfillmentStatus
                ? t(`order.fulfillment.${fulfillmentStatus}`)
                : t('order.statusNone')}
            </p>
          </div>
        </div>
      </div>
      <Suspense fallback={<OrderRatingsLoading />}>
        <Await resolve={ratings}>
          {(view) => <OrderRatings view={view} />}
        </Await>
      </Suspense>
      <br />
      <p>
        <a target="_blank" href={order.statusPageUrl} rel="noreferrer">
          {t('order.viewStatus')} <span aria-hidden="true">→</span>
        </a>
      </p>
    </div>
  );
}

function OrderLineRow({lineItem}: {lineItem: OrderLineItemFullFragment}) {
  return (
    <tr key={lineItem.id}>
      <td>
        <div>
          {lineItem?.image && (
            <div>
              <Image data={lineItem.image} width={96} height={96} />
            </div>
          )}
          <div>
            <p>{lineItem.title}</p>
            <small>{lineItem.variantTitle}</small>
          </div>
        </div>
      </td>
      <td>
        <Money data={lineItem.price!} />
      </td>
      <td>{lineItem.quantity}</td>
      <td>
        <Money data={lineItem.totalDiscount!} />
      </td>
    </tr>
  );
}
