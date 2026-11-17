import {describe, expect, it} from 'vitest';
import {
  isMobileRequest,
  isMobileUserAgent,
} from '../../app/lib/try-on/device';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID_PHONE =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const ANDROID_TABLET =
  'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const IPAD =
  'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const DESKTOP_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const DESKTOP_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

function request(headers: Record<string, string>) {
  return new Request('https://shop.example/', {headers});
}

describe('isMobileUserAgent', () => {
  it('recognises phones and tablets', () => {
    expect(isMobileUserAgent(IPHONE)).toBe(true);
    expect(isMobileUserAgent(ANDROID_PHONE)).toBe(true);
    expect(isMobileUserAgent(ANDROID_TABLET)).toBe(true);
    expect(isMobileUserAgent(IPAD)).toBe(true);
  });

  it('rejects desktop browsers and missing values', () => {
    expect(isMobileUserAgent(DESKTOP_CHROME)).toBe(false);
    expect(isMobileUserAgent(DESKTOP_SAFARI)).toBe(false);
    expect(isMobileUserAgent('')).toBe(false);
    expect(isMobileUserAgent(null)).toBe(false);
    expect(isMobileUserAgent(undefined)).toBe(false);
  });
});

describe('isMobileRequest', () => {
  it('trusts the client hint over a reduced user agent', () => {
    expect(
      isMobileRequest(request({'sec-ch-ua-mobile': '?1', 'user-agent': DESKTOP_CHROME})),
    ).toBe(true);
  });

  it('falls back to the user agent without the hint', () => {
    expect(isMobileRequest(request({'user-agent': IPHONE}))).toBe(true);
    expect(isMobileRequest(request({'user-agent': DESKTOP_CHROME}))).toBe(false);
  });

  it('still uses the user agent when the hint says desktop', () => {
    expect(
      isMobileRequest(request({'sec-ch-ua-mobile': '?0', 'user-agent': IPHONE})),
    ).toBe(true);
    expect(
      isMobileRequest(
        request({'sec-ch-ua-mobile': '?0', 'user-agent': DESKTOP_CHROME}),
      ),
    ).toBe(false);
  });
});
