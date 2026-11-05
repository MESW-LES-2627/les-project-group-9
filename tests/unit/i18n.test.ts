import {describe, expect, it} from 'vitest';
import {getLocaleFromRequest} from '../../app/lib/i18n';

function localeFor(url: string) {
  return getLocaleFromRequest(new Request(url));
}

describe('getLocaleFromRequest', () => {
  it('reads a supported locale from the first subdomain', () => {
    expect(localeFor('https://fr.jeweliette.com/')).toEqual({
      language: 'FR',
      country: 'FR',
    });
  });

  it('maps a country to its language', () => {
    expect(localeFor('https://jp.jeweliette.com/')).toEqual({
      language: 'JA',
      country: 'JP',
    });
  });

  it('falls back to English (US) for other hosts', () => {
    expect(localeFor('https://www.jeweliette.com/')).toEqual({
      language: 'EN',
      country: 'US',
    });
    expect(localeFor('http://localhost:3000/')).toEqual({
      language: 'EN',
      country: 'US',
    });
  });
});
