import {data, redirect} from 'react-router';
import type {Route} from './+types/locale';
import {isLocaleCode, serializeLocaleCookie} from '~/lib/i18n';
import {toSafeRedirectPath} from '~/lib/redirect';

/**
 * POST /locale — switches the storefront language.
 *
 * Form fields: `locale` (a key of `LOCALES`: `en`, `pt`, `fr`) and
 * `redirectTo` (a same-origin path, usually the current page). Sets the language cookie and redirects back.
 */
export async function action({request}: Route.ActionArgs) {
  if (request.method !== 'POST') return methodNotAllowed();

  const form = await request.formData();
  const locale = form.get('locale');

  if (!isLocaleCode(locale)) {
    return data({error: 'Unsupported language'}, {status: 400});
  }

  const url = new URL(request.url);
  const redirectTo = toSafeRedirectPath(form.get('redirectTo'), request.url);

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': serializeLocaleCookie(locale, {
        secure: url.protocol === 'https:',
      }),
    },
  });
}

/** GET /locale is not supported: the language only changes through the form. */
export function loader() {
  return methodNotAllowed();
}

function methodNotAllowed() {
  return data(
    {error: 'Method not allowed'},
    {status: 405, headers: {Allow: 'POST'}},
  );
}
