import type {CustomerFragment} from 'customer-accountapi.generated';
import type {CustomerUpdateInput} from '@shopify/hydrogen/customer-account-api-types';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from 'react-router';
import type {Route} from './+types/account.profile';
import {PreferencesForm} from '~/components/account/PreferencesForm';
import {RingSizeForm} from '~/components/account/RingSizeForm';
import {translatorFor, useTranslation} from '~/lib/i18n';

export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Profile'}];
};

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;
  // Our own messages are translated; Shopify validation messages are passed through.
  const t = translatorFor(customerAccount.i18n);

  if (request.method !== 'PUT') {
    return data({error: t('account.error.method')}, {status: 405});
  }

  const form = await request.formData();

  try {
    const customer: CustomerUpdateInput = {};
    for (const key of ['firstName', 'lastName'] as const) {
      const value = form.get(key);
      if (typeof value === 'string') {
        customer[key] = value.trim();
      }
    }

    const {data, errors} = await customerAccount.mutate(
      CUSTOMER_UPDATE_MUTATION,
      {
        variables: {
          customer,
          language: customerAccount.i18n.language,
        },
      },
    );

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    if (!data?.customerUpdate?.customer) {
      throw new Error(t('profile.error.update'));
    }

    return {
      error: null,
      customer: data?.customerUpdate?.customer,
    };
  } catch (error: any) {
    return data(
      {error: error.message, customer: null},
      {
        status: 400,
      },
    );
  }
}

export default function AccountProfile() {
  const account = useOutletContext<{customer: CustomerFragment}>();
  const {state} = useNavigation();
  const action = useActionData<ActionResponse>();
  const customer = action?.customer ?? account?.customer;
  const t = useTranslation();

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <section>
        <h2 className="font-display text-2xl text-ink">
          {t('profile.personalInfo')}
        </h2>

        <Form method="PUT" className="mt-5 space-y-5">
          <fieldset className="space-y-4">
            <legend className="sr-only">{t('profile.personalInfo')}</legend>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.15em] text-primary">
                {t('address.firstName')}
              </span>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder={t('address.firstName')}
                aria-label={t('address.firstName')}
                defaultValue={customer.firstName ?? ''}
                className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.15em] text-primary">
                {t('address.lastName')}
              </span>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder={t('address.lastName')}
                aria-label={t('address.lastName')}
                defaultValue={customer.lastName ?? ''}
                className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
          </fieldset>

          {action?.error ? (
            <p role="alert" className="text-sm text-red-700">
              {action.error}
            </p>
          ) : action?.customer && state === 'idle' ? (
            <p role="status" className="text-sm text-primary">
              {t('profile.updated')}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={state !== 'idle'}
            className="bg-primary px-6 py-3 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-ink disabled:opacity-60"
          >
            {state !== 'idle' ? t('profile.updating') : t('profile.update')}
          </button>
        </Form>
      </section>

      <PreferencesForm />
      <RingSizeForm />
    </div>
  );
}
