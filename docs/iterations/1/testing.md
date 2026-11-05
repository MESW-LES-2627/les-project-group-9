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
|---|---|---|
| `tests/unit` | Unit tests for `app/lib` and API routes | Vitest (node) |
| `tests/components/<page>` | Component tests, grouped like `app/components/<page>` | Vitest + React Testing Library (jsdom) |
| `tests/e2e` | End-to-end tests of the shopper flows | Playwright (Chromium) |

## Unit and component tests

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Component tests cover:

| Folder | Components |
|---|---|
| `account` | `PreferencesForm` |
| `cart` | `CartLineItem`, `CartSummary` |
| `layout` | `MockShopNotice` |
| `product` | `AddToCartButton`, `AllergenBadge`, `FavoriteButton`, `ProductBadge`, `ProductForm`, `ProductGallery`, `ProductItem`, `ProductPrice`, `RecommendedProducts`, swatch gallery |
| `search` | `SearchForm` |
| `shared` | `ConfirmDialog` |

## End-to-end tests

```bash
npm run test:e2e
```

Playwright builds the app and starts it with `npm run preview` on port 3000. If a server is already running there (for example `npm run dev`), it is reused.

The tests run against the store in `.env`. To run them like CI does, set:

```
PUBLIC_STORE_DOMAIN=mock.shop
```

Useful options:

```bash
npx playwright test tests/e2e/cart.spec.ts   # one file
npx playwright test --ui                     # step through tests in a browser
```

| File | Flows |
|---|---|
| `home.spec.ts` | Home loads; hero banner opens a collection; every featured product opens; the header logo goes back home |
| `collection.spec.ts` | `/collections` opens a collection; a collection opens a product; home → collection → product |
| `swatch.spec.ts` | Selecting a product option updates the selected variant |
| `cart.spec.ts` | Empty cart; adding a product updates the cart count; change a line's quantity and remove it |
| `search.spec.ts` | Empty search; no results; searching from the search page and from the header |
| `favorites.spec.ts` | Logged-out shoppers are sent to log in from the favorites page, product page and product cards |

Customer account routes (`/account/*`) are not covered, because they need Shopify Customer Account OAuth.

### Writing E2E tests

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

- **test**: install, lint, typecheck, unit and component tests.
- **e2e**: runs the Playwright tests against [mock.shop](https://mock.shop), so no repository secrets are needed. On failure the Playwright report is uploaded as an artifact.
