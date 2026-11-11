# How to run the tests

## Requirements

- Node.js 22 or 24

## Setup

```bash
npm install
npx playwright install chromium
```

## Test layout

| Folder | Kind | Tool |
| --- | --- | --- |
| `tests/unit` | Unit tests for `app/lib` and API routes | Vitest (node) |
| `tests/components/<group>` | Component tests, grouped like `app/components/<group>` (fitting-room tests currently sit at the top of `tests/components`) | Vitest + React Testing Library (jsdom) |
| `tests/e2e` | End-to-end tests of the shopper flows | Playwright (Chromium) |

## Unit and component tests

```bash
npm test
```

`vitest.config.ts` defines two projects: `unit` (`tests/**/*.test.ts`, node environment) and `components` (`tests/**/*.test.tsx`, jsdom, with `vitest.setup.ts` loading `jest-dom` matchers and cleaning up after each test). The `~` alias points to `app/`.

Run one project or file:

```bash
npx vitest run --project unit
npx vitest run tests/unit/search.test.ts
```

Watch mode:

```bash
npm run test:watch
```

Unit tests (`tests/unit`) cover the `app/lib` modules (allergens, i18n, materials, metafields, order filters, profile schema/preferences/customer, recommendation engine and traits, redirect, ring category, search filters, variants, fitting room) and the API/form routes (`api.profile*`, `api.recommendations`, `locale`, fitting-room move to cart). `response.test.ts` checks the worker's response finishing (`app/lib/response.server.ts`): the language and session cookies both survive on one response, plus the `Vary` merging.

Component tests cover:

| Folder | Components |
| --- | --- |
| *(top level)* | `FittingRoomButton`, `FittingRoomView` |
| `account` | `PreferencesForm`, `RingSizeForm` |
| `cart` | `CartLineItem`, `CartSummary` |
| `layout` | `LanguageSelector` (both languages, form fields, keyboard), `MockShopNotice` |
| `product` | `AddToCartButton`, `AllergenBadge`, `FavoriteButton`, `ProductBadge`, `ProductForm`, `ProductGallery`, `ProductItem`, `ProductPrice`, `RecommendedProducts`, `RingSizeHelp`, swatch gallery |
| `search` | `SearchForm`, `SearchResultsPredictive` |
| `shared` | `ConfirmDialog` |

`AddToCartButton` and `MockShopNotice` are tested but not currently used by the app (see [architecture.md → Known issues](architecture.md#known-issues)).

## End-to-end tests

```bash
npm run test:e2e
```

Playwright builds the app and starts it with `npm run preview` on port 3000. If a server is already running there (for example `npm run dev`), it is reused.

The only Playwright project is desktop Chromium. To check a phone-sized screen, set the viewport in the test (`page.setViewportSize`), as `footer.spec.ts` does.

The tests run against the store in `.env`. To run them like CI does, set:

```dotenv
PUBLIC_STORE_DOMAIN=mock.shop
```

Useful options:

```bash
npx playwright test tests/e2e/cart.spec.ts   # one file
npx playwright test --ui                     # step through tests in a browser
```

| File | Flows |
| --- | --- |
| `home.spec.ts` | Home loads; hero banner opens a collection; every featured product opens; the header logo goes back home |
| `collection.spec.ts` | `/collections` opens a collection; a collection opens a product; home → collection → product |
| `swatch.spec.ts` | Selecting a product option updates the selected variant |
| `cart.spec.ts` | Empty cart; adding a product updates the cart count; change a line's quantity and remove it |
| `search.spec.ts` | Empty search; no results; searching from the search page and from the header |
| `favorites.spec.ts` | Logged-out shoppers are sent to log in from the favorites page, product page and product cards |
| `footer.spec.ts` | Footer "Discover" links are on separate lines at 1280px and 375px, and open their pages |
| `header.spec.ts` | Compact header at 375, 800 and 1279px and desktop header at 1280px, in EN and PT: which controls are visible, actions available, menu contents, 44px language targets, no horizontal overflow, nav-to-actions gap |
| `language.spec.ts` | English by default; choosing PT keeps the path and query, sets the cookie (HttpOnly, SameSite=Lax) and persists after reload; choosing from the mobile menu at 375px (44px targets, no horizontal overflow); the cart, other cookies and currency are unchanged after switching; `/locale` rejects unsupported languages, external redirects and GET; pages send `Vary: Cookie, Accept-Language` |

Customer account routes (`/account/*`) are not covered, because they need Shopify Customer Account OAuth.

### Writing E2E tests

- Shared helpers live in `tests/e2e/support/` (e.g. `cart.ts`: `addProductToBag`, `cartCount`). Playwright collects only `*.spec.*`/`*.test.*` files (its default `testMatch`), so support files are not run as tests.
- Tests run in English by default (no language cookie). To test Portuguese, switch with the header selector as `language.spec.ts` does.
- Find elements by role, label or text (`getByRole`, `getByText`), not by CSS classes.
- Do not depend on store data: never assert product names or prices. Pick products at runtime (for example the first link in `/collections/all`) and assert structure and behaviour, such as the cart count going up.
- Wait for server actions when the UI updates optimistically, for example the cart `POST` before leaving the page.

## Static checks

```bash
npm run lint
npm run typecheck
```

## Continuous integration

`.github/workflows/test.yml` runs on pushes to `main` and on pull requests:

- **test**: install, lint, typecheck, unit and component tests. CI does not run `npm run build`; run it locally before committing.
- **e2e**: runs the Playwright tests against [mock.shop](https://mock.shop), so no repository secrets are needed. On failure the Playwright report is uploaded as an artifact.
