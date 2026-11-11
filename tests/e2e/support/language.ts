import {expect, type Locator} from '@playwright/test';

export type LanguageShortCode = 'EN' | 'PT' | 'FR';

/**
 * The language dropdown trigger (a native <summary>, which has no ARIA role
 * Playwright can query) inside a scope such as the banner or the menu dialog.
 */
export function languageTrigger(scope: Locator) {
  return scope.locator('summary').filter({hasText: /^(EN|PT|FR),/});
}

/** A language option in an open dropdown, e.g. "PT Português (Portugal)". */
export function languageOption(scope: Locator, code: LanguageShortCode) {
  return scope.getByRole('button', {name: new RegExp(`^${code} `)});
}

/** Opens the dropdown in `scope` and chooses a language. */
export async function chooseLanguage(scope: Locator, code: LanguageShortCode) {
  await languageTrigger(scope).click();
  await languageOption(scope, code).click();
}

/** Asserts that the trigger in `scope` shows `code` as the current language. */
export async function expectCurrentLanguage(
  scope: Locator,
  code: LanguageShortCode,
) {
  await expect(languageTrigger(scope)).toHaveText(new RegExp(`^${code},`));
}
