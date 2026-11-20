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
| `tests/components/<group>` | Component tests, grouped like `app/components/<group>` (the fitting-room and `Favorites` tests currently sit at the top of `tests/components`) | Vitest + React Testing Library (jsdom) |
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

Unit tests (`tests/unit`) cover the `app/lib` modules (the list below is not exhaustive; see the folder) (order ratings, product customization and the cart customization check, allergens, i18n, materials, metafields, order filters, profile schema/preferences/customer, recommendation engine and traits, redirect, ring category, search filters, variants, fitting room list/loader) and the API/form routes (`api.profile*`, `api.recommendations`, `locale`, fitting-room move to cart). The try-on modules have their own tests: `try-on-catalog` (category gate, overlay/PNG resolution, CORS URLs, size parsing, piece ids), `try-on-anchors` (ear anchors, earring stacking, far-ear hiding with hysteresis, necklace projection, head mask, smoothing), `try-on-frame` (multi-piece per-frame plans, necklace draw order, earring stacks, photo-mode hysteresis), `try-on-render` (mirroring, per-layer images, overlay transforms, head clip), `try-on-camera` (constraints, error mapping, track cleanup), `try-on-upload` (file validation), `try-on-url` and `try-on-device` (cache-busting, deep links including the fitting-room look link, `Sec-CH-UA-Mobile`/UA detection). `response.test.ts` checks the worker's response finishing (`app/lib/response.server.ts`): the language and session cookies both survive on one response, plus the `Vary` merging. Localization: `messages.test.ts` (every key in EN, PT and FR, no unused keys (a key counts as used when it appears as a literal in `app/` or its prefix is built in a template such as `` `allergen.${code}` ``), no empty messages, identical placeholders, plural shapes and valid plural categories, glossary terms, French no-break spacing), `i18n-format.test.ts` (money, dates and lists per locale with hand-written expectations; server and `meta` translators), `route-meta.test.ts` (each route's page title in EN, PT and FR, the English fallback without a root locale, and the Shopify product title left untranslated), `translation-fallback.test.ts` (a PT request that gets English Shopify content renders it without error, with no hardcoded language in the query) and `locale-propagation.test.ts` (every GraphQL operation passes `$language` through `@inContext`; Hydrogen's real storefront client sends the resolved language and caches each language separately).

Component tests cover:

| Folder | Components |
| --- | --- |
| *(top level)* | `Favorites`, `FittingRoomButton`, `FittingRoomView` (variant rows with colours, explicit selection, "No 3D" rows disabled, cart move per variant, sold-out Move to cart disabled, and the selected look opening one QR/camera session) |
| `account` | `AccountProfile` (the profile route's form in EN, PT and FR, the "Profile updated." confirmation and the error instead of it), `OrderRatings` (US-058: star radio group with the keyboard, submit through a real `useFetcher` to a stubbed `/api/order-ratings`, pending/saved/already-rated/error states, read-only saved ratings, not-delivered and unavailable states, EN/PT/FR), `OrderRatingsRevalidation` (US-058: the real order route with a stub loader and rating action: after saving one product the confirmation stays, another product's unsaved choice stays, the order loader does not re-run for 201 or 409, a reload reads the saved rating; `shouldRevalidate` keeps the default for other actions), `PreferencesForm`, `PreferencesFlow`, `PreferencesDeleteFlow`, `PreferencesData` (US-068/US-071 edit, delete and export), `RingSizeForm` |
| `cart` | `CartLineItem`, `CartSummary` |
| `collections` | `CatalogFilters`: app-named filter labels in EN, PT and FR; other filters keep the Shopify label |
| `layout` | `LanguageSelector` dropdown (closed trigger with the localized current language in EN/PT/FR, EN/PT/FR options with flags, names, `lang` and `aria-current`, posting path, query and hash, arrow keys/Home/End/Escape with focus return, keyboard choice, outside click and focus-out closing, inline layout) |
| `i18n` | `LocalizedComponents`: `ProductItem` and `FittingRoomView` in EN, PT and FR (labels, plurals, No 3D, the look button, price format) with untranslated catalog content. `LocalizedCartAndSearch`: `CartMain` (empty bag), `CartSummary` (labels, applied codes, subtotal format) and `SearchResultsPredictive` (section headings, price format, no-results quotes) in EN, PT and FR |
| `product` | `AddToCartButton`, `AllergenBadge`, `ProductActionButton`, `FavoriteButton`, `ProductBadge`, `ProductForm`, `ProductCustomization`, `ProductGallery`, `ProductItem`, `ProductPrice`, `RecommendedProducts`, `RingSizeHelp`, swatch gallery, `TryOnSection` (hairline + "See it on you" heading + button), `TryOnButton` (button, desktop QR, phone camera, `?tryOn=1` deep link and clearing the parameter, photo hand-off) |
| `profile` | `ProfileProvider` |
| `search` | `SearchForm`, `SearchFormPredictive` (refetches when a stale response lands last), `SearchResultsPredictive` |
| `shared` | `ConfirmDialog`, `Dialog` (portal, scroll lock, Escape, backdrop, focus trap) and `QrCode` (accessible SVG, deterministic modules) |
| `try-on` | `CameraStage` (visible preview element, transparent multi-layer canvas, attachment without awaiting playback, pieces joining without restarting the stream, camera released → retry, tracks stopped on unmount), `PhotoFallback` (decode, landmarker in image mode, multi-piece composition, dragging/resizing/reset, invalid/oversized files, no face), `TryOnDialog` (instant preview, background landmarker loading, multiple overlays, look copy, opaque-overlay refusal, camera failure → photo fallback + retry, start-tap path for QR links, unsupported-browser message, landmarker closed on unmount), `TryOnQrDialog` (QR, link, upload hand-off, closing) and `preload` (asset warming); `overlay.test.tsx` checks the transparency probe, the batch loader and the aspect helper |

`AddToCartButton` is tested but not currently used by the app (see [architecture.md → Known issues](architecture.md#known-issues)).

### What the localization tests do and do not prove

| Layer | Tests | Proves |
| --- | --- | --- |
| Dictionaries and UI | `messages.test.ts`, `i18n-format.test.ts`, component tests in `i18n`, `layout`, `collections`, `product`, E2E `localized-flows.spec.ts` and `language.spec.ts` | Every key exists in EN/PT/FR; interface text, prices, dates and plurals follow the active language. |
| Locale sent to Shopify | `i18n.test.ts`, `locale-propagation.test.ts` | Cookie and `Accept-Language` resolve to the right language code; every GraphQL operation uses `@inContext(language: $language)`; no code hardcodes a language; Hydrogen sends the resolved language with country `US` and keeps a separate cache entry per language. |
| Localized Shopify fixtures | `LocalizedComponents.test.tsx`, `CatalogFilters.test.tsx` | Components render the content Shopify returns (any language) without replacing it. |
| English fallback | `translation-fallback.test.ts` | A PT request that receives English content renders it without error (mocked responses). |
| Live Shopify translations | None automated | Needs PT/FR published in Shopify; follow [i18n.md → Read-only verification](i18n.md#read-only-verification). `<html lang>` changing is **not** evidence that catalog content is translated. |
| CI installation | GitHub Actions `e2e` job | Only that the hosted runner could install Chromium and its system packages; see [Continuous integration](#continuous-integration). |

## End-to-end tests

```bash
npm run test:e2e
```

Playwright builds the app and starts it with `npm run preview` on port 3000. Locally, a server already running there (for example `npm run dev`) is reused; in CI it never is (`reuseExistingServer: !process.env.CI`).

The only Playwright project is desktop Chromium. To check a phone-sized screen, set the viewport in the test (`page.setViewportSize`), as `footer.spec.ts` does.

The preview server uses the store in `.env`. CI writes this `.env` before running Playwright:

```dotenv
SESSION_SECRET=ci-test-secret
PUBLIC_STORE_DOMAIN=mock.shop
```

Playwright itself does not load `.env`. Tests that read `process.env` (the try-on gate test in `try-on.spec.ts`) only see variables set in the shell, so to run that test locally also set `PUBLIC_STORE_DOMAIN=mock.shop` in the shell that runs `npm run test:e2e`. The CI step sets no shell variable, so that test is currently skipped in CI (see [Continuous integration](#continuous-integration)).

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
| `customization.spec.ts` | A product marked as customizable shows its Customize panel: the first allowed gem colour is selected and the engraving stops at its maximum length. Adding it with an engraving and a gem colour shows both on the bag line. Skips when no product in the store is customizable (mock.shop has none) |
| `cart.spec.ts` | Empty cart; adding a product updates the cart count; change a line's quantity and remove it |
| `search.spec.ts` | Empty search; no results; searching from the search page and from the header |
| `favorites.spec.ts` | Logged-out shoppers are sent to log in from the favorites page, product page and product cards |
| `fitting-room.spec.ts` | With `/api/profile` mocked as a logged-in shopper: a piece without a model is listed, its checkbox is disabled and marked No 3D; two try-on variants selected together open one look, and the desktop QR link carries both variant ids. With a phone user agent, the same look opens the camera dialog and falls back to the photo upload when permission is denied. The look tests skip when the active catalog has fewer than two distinct try-on variants. |
| `try-on.spec.ts` | On the CI catalog, products without a transparent overlay have no Try on button. On a store with a supported piece: the desktop QR dialog, the `?tryOn=1` deep link (parameter cleared) and, with a phone user agent, the camera dialog falling back to the photo upload when permission is denied. The gate test runs only when `PUBLIC_STORE_DOMAIN=mock.shop` is set in the Playwright process environment (not via `.env`; currently skipped in CI); the flow tests scan up to 20 products and skip when none is try-on capable. |
| `preferences.spec.ts` | Allergen and ring-size deletion (US-068): a deleted allergen stops triggering the warning and a deleted ring size stops being shown |
| `preferences-data.spec.ts` | The preference data endpoints (US-071) require a logged-in shopper |
| `recommendations.spec.ts` | No suggestions are shown without preferences or favorites |
| `footer.spec.ts` | Footer "Discover" links are on separate lines at 1280px and 375px, and open their pages; on a short page the footer reaches the bottom of the window |
| `header.spec.ts` | Compact header at 375, 800 and 1279px and desktop header at 1280px, in EN, PT and FR: which controls are visible, actions available, menu contents, 44px language targets, no horizontal overflow, nav-to-actions gap |
| `language.spec.ts` | Dropdown: opens above the page (not clipped), marks the current language, closes on Escape (focus returns) and outside click, works with the keyboard alone, and fits the phone menu. Application locale only (Portuguese and French content is not published in Shopify, so translated content is not asserted). Fresh `fr-FR` and `fr-CA` browsers get French; choosing French in `en-US` and `pt-PT` browsers keeps the path and query and persists after reload and navigation; choosing English in a French browser persists; French from the phone menu with the French plural cart label. A fresh `en-US` browser gets English and a fresh `pt-PT` browser gets Portuguese, with no cookie set; choosing English in the Portuguese browser survives reload and navigation; `<html lang>` matches; choosing PT keeps the path and query, sets the cookie (HttpOnly, SameSite=Lax) and persists after reload; choosing from the mobile menu at 375px (44px targets, no horizontal overflow); the cart, other cookies and currency are unchanged after switching; `/locale` rejects unsupported languages, external redirects and GET; pages send `Vary: Cookie, Accept-Language` |
| `language-layout.spec.ts` | In PT and FR at 375px: home, collections, all pieces, bag, search and a product page do not scroll sideways; header, menu drawer and product page controls stay on screen and their text does not overflow (text cut on purpose with an ellipsis is allowed) |
| `order-ratings.spec.ts` | US-058 rating endpoint on the preview server: GET is 405; POST without a same-site `Origin` is 403; an anonymous POST with forged identity fields is 401; responses are `no-store`. Nothing reaches Shopify |
| `localized-flows.spec.ts` | In fresh `pt-PT` and `fr-FR` browsers: home (title, announcement, hero link), collection (sort and "pieces loaded" label), product page (add to bag or sold out, description accordion), empty bag, search, logged-out favorites, 404 page. Interface text only; catalog content is not asserted |

Customer account routes (`/account/*`) are not covered, because they need Shopify Customer Account OAuth.

### Order ratings (US-058): what each layer proves

| Layer | Files | Proves |
| --- | --- | --- |
| Unit | `ratings-rules.test.ts` | Rating values (only JSON integers 1–5), payload validation, browser identity fields ignored, grouping by product, deterministic handles, the full-order delivery predicate (split shipments, FULFILLED without delivery, cancelled fulfillments, pickup) |
| Adapter HTTP contract | `ratings-store.test.ts`, `ratings-admin-token.test.ts` | The production `ShopifyRatingStore` and token provider against a fake Admin API: request URL, headers and variables; create-only (no upsert/update; a retry reaches `metaobjectCreate`); the adapter's handling of the two **modelled** answers to a taken handle (rejection, or a renamed record that it deletes), including a test showing that a failed clean-up leaves two records; reads by exact handle; HTTP/GraphQL/network failures are errors; client credentials exchange, caching, renewal and 401 recovery. The fake's handle rules are assumptions: these tests do **not** show what Shopify actually does |
| Route integration | `api-order-ratings.test.ts` | The real `api.order-ratings` action and order-page loader with the real service, eligibility loader and adapter, with fake Customer Account and Admin APIs (`tests/unit/support/ratings-fakes.ts`): auth, same-origin, ownership, product membership, delivery, pagination of lines/fulfillments/items and its fail-closed limit, upstream failures without writes, duplicates and concurrency, later orders, reload, cross-customer isolation, `no-store` |
| Components | `tests/components/account/OrderRatings.test.tsx` | Keyboard use and all UI states in EN/PT/FR |
| E2E (preview) | `order-ratings.spec.ts` | Endpoint rejections without any login or Shopify write |
| Rating UI in Playwright | **Not covered (blocked)** | The order page is server-rendered behind the Customer Account session: without a real OAuth session the worker answers `/account/orders/:id` with a 302 to login, and the client data request (`.data`) is a server-made redirect too. Playwright's `page.route` only sees browser traffic, so the project's interception approach (used for `/api/profile`) cannot supply the order or fake Shopify for these loaders, and a reload always goes through the server. Rendering it would need a server-side fake injected into a separate E2E-only build, which is not set up (no production login bypass). The UI flow is covered by the component tests above and must be checked on staging |
| Live Shopify (opt-in, staging only) | `tests/staging/rating-storage.staging.ts`, `npm run test:staging:ratings` (`vitest.staging.config.ts`) | Shopify's real answer to an explicit-handle collision and to concurrent creates with different values, and the final stored state. Never part of `npm test` or CI; writes only when `RATINGS_STAGING_CONFIRM_WRITES` equals the store domain. Reads its variables from the shell only (not from `.env`); the optional read-only `RATINGS_STAGING_INSPECT` counts the records of one storefront-made rating. See [architecture.md → Staging verification](architecture.md#staging-verification) |
| **Not automated** | — | A real signed-in buyer, real delivery data and real metaobject writes (the staging suite covers storage only, and only when run by hand). mock.shop has no customer accounts or Admin API, and the suite must not write to a shop. Follow [architecture.md → Staging verification](architecture.md#staging-verification). Mocked tests do not prove the live Shopify integration. |

### Writing E2E tests

- Shared helpers live in `tests/e2e/support/` (`cart.ts`: `addProductToBag`, `cartCount`, `cartBadge`, `openCartLabel`, `openAvailableProduct`; `catalog.ts`: `productLinks`, `findProducts`, `openProduct`, which retry around hydration navigations; `language.ts`: `languageTrigger`, `languageOption`, `chooseLanguage`, `expectCurrentLanguage` for the dropdown; `layout.ts`: `expectTouchTarget`, which retries until layout settles). Playwright collects only `*.spec.*`/`*.test.*` files (its default `testMatch`), so support files are not run as tests.
- Prices are formatted per locale: when asserting them, set the locale explicitly (`LocaleContext.Provider`) and write the expected string out; pt-PT and fr-FR put a no-break space before `€`. Testing Library's default normalizer turns that into a normal space in the element text only, so use `{normalizer: (text) => text}` or compare `textContent`.
- The browser language is pinned to `en-US` in `playwright.config.ts` (`use.locale`), because the storefront negotiates its language from `Accept-Language`. To test Portuguese, use `test.use({locale: 'pt-PT'})` or switch with the selector, as `language.spec.ts` does.
- Find elements by role, label or text (`getByRole`, `getByText`), not by CSS classes.
- Do not depend on store data: never assert product names or prices. Pick products at runtime (for example the first link in `/collections/all`) and assert structure and behaviour, such as the cart count going up.
- A POST that the server rejects before reading its body (e.g. 401/403 from an `api.*` route) can make the local MiniOxygen preview reset the next request on the same keep-alive connection (`ECONNRESET`). A `Connection: close` request header is not enough (Playwright may still reuse the connection); send each such POST from its own `playwright.request.newContext()`, as `order-ratings.spec.ts` does. Do not relax the assertions.
- Wait for server actions when the UI updates optimistically, for example the cart `POST` before leaving the page.
- Try-on needs `custom.try_on_overlay` on an earring or necklace. `tests/e2e/try-on.spec.ts` and `tests/e2e/fitting-room.spec.ts` scan up to 20 product pages for a Try on button and skip their flow tests when the active catalog has none; the try-on gate test only runs when `PUBLIC_STORE_DOMAIN=mock.shop` is set in the shell environment of the Playwright process (it is skipped in CI today). The fitting-room spec mocks `/api/profile` to simulate a logged-in customer without Customer Account OAuth, and asserts the "No 3D" row with a product that has no overlay. The phone tests stub `navigator.mediaDevices.getUserMedia` with `page.addInitScript` so the camera-denied fallback can be asserted without a permission prompt. Real face detection is verified manually on a phone; the landmarker itself is mocked in component tests.

## Coverage

```bash
npm run test:coverage
```

Runs the Vitest projects with V8 coverage over `app/**/*.{ts,tsx}` (excluding the entry files, `app/routes.ts`, `*.d.ts` and `app/graphql/**`). `vitest.config.ts` sets the minimum thresholds: statements 45 %, branches 40 %, functions 45 %, lines 45 %; the command fails below them. Reporters are `text`, `json-summary` and `json` (`reportOnFailure: true`). In CI this replaces `npm test` (TASK-005).

## Static checks

```bash
npm run lint
npm run typecheck
```

`npm run lint` also rejects untranslated UI text in `app/**/*.tsx`: literal text in JSX (`react/jsx-no-literals`, symbols such as `→` or `·` allowed) and literal `aria-label`, `title`, `alt` or `placeholder` values with letters (`no-restricted-syntax`). See [i18n.md → Adding a string](i18n.md#adding-a-string).

## Continuous integration

`.github/workflows/test.yml` runs on pushes to `main` and on pull requests:

- **test**: install, lint, typecheck and `npm run test:coverage` (unit and component tests with the coverage thresholds above). A coverage report is then posted to the pull request by `davelosert/vitest-coverage-report-action` (also when tests fail, not when lint or typecheck failed). CI does not run `npm run build`; run it locally before committing.
- **e2e**: writes the `.env` shown above and runs the Playwright tests against [mock.shop](https://mock.shop), so no repository secrets are needed. On failure the job uploads the `playwright-report` folder, but the CI reporter is `github` (`playwright.config.ts`), which does not write that folder, so the artifact is probably empty; traces from retries go to `test-results/`, which is not uploaded. Known gaps (workflow changes, not made in documentation work): the try-on gate test is skipped because `PUBLIC_STORE_DOMAIN` is not set in the step's environment, and the report artifact.
  - The job runs on `ubuntu-24.04` (not `ubuntu-latest`) with a 30-minute timeout. `npx playwright install --with-deps chromium` installs system packages with `apt`, and a pinned image keeps that package set predictable. Pinning does **not** fix DNS or package-mirror outages on the hosted runner.
  - The install step is tried up to three times (15 s, then 30 s between attempts) and fails the job if all three fail. A failure at this step happens before any test runs; it is an environment problem, not a test failure, so do not change assertions because of it. If it keeps failing, check the log for `Temporary failure resolving` and rerun later.

Other workflows: `oxygen-deployment-*.yml` deploys every push on any branch to Oxygen with `shopify hydrogen deploy` (it runs no tests and does not wait for `test.yml`); `sync.yml` and `sync-issues.yml` mirror branches and issues to another repository and are not part of testing.
