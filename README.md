# Jeweliette

Jeweliette is a headless e-commerce storefront for a fashion jewelry and accessories brand
(earrings, rings, bracelets, necklaces, pendants, charms and watches). It is built with
[Shopify Hydrogen](https://shopify.dev/docs/storefronts/headless/hydrogen) and deployed to
Shopify Oxygen. Besides the usual catalog, search, cart and customer account, the current
code offers:

- **Favorites** and a **fitting room** saved to the customer's account
- A **preference profile**: allergies, skin tone and undertone, ring sizes, preferred
  materials, colours and gemstones; it can be edited, exported and deleted. Skin tone is
  stored but does not yet change suggestions or try-on
- **Personalised suggestions** based on favorites and preferences
- **Allergen warnings** before adding a piece to the bag, when the product's allergen data
  entered in Shopify matches the shopper's allergies (a warning aid, not a safety guarantee),
  and a ring-size guide
- **Front-camera try-on** for earrings and necklaces that have a try-on overlay, on a phone
  (desktop shows a QR code), including a multi-piece look from the fitting room
- **Restricted customization** on products the merchant enables: a gem colour from an
  allowed list and an engraving up to a set length
- **Order ratings** (US-058): 1–5 stars per product of a fully delivered order, stored
  privately; they are not shown publicly yet
- **English (US), Portuguese (Portugal) and French**: language selection and a fully
  translated interface; catalog content is translated in Shopify ([docs/i18n.md](docs/i18n.md))

Planned work and its status are tracked in the iteration documents
([docs/iterations/](docs/iterations/)) and GitHub issues, not here.

## Tech stack

Hydrogen 2026.4 · React Router 7 (file-based routes) · React 18 · TypeScript (strict) ·
Tailwind CSS 4 · Vite · Vitest + Testing Library · Playwright. Data comes from the Shopify
Storefront API and Customer Account API (GraphQL).

## Prerequisites

- Node.js 22 or 24
- Access to the Shopify store (to get API tokens), or use [mock.shop](https://mock.shop) for
  a read-only demo catalog

## Setup

```bash
npm install
cp .env.example .env    # then fill in the values
npm run dev             # http://localhost:3000
```

`.env.example` lists the variables:

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | Signs the session cookie (required) |
| `PUBLIC_STORE_DOMAIN` | `*.myshopify.com` domain, or `mock.shop` |
| `PUBLIC_STOREFRONT_API_TOKEN`, `PRIVATE_STOREFRONT_API_TOKEN`, `PUBLIC_STOREFRONT_ID` | Storefront API access |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `PUBLIC_CUSTOMER_ACCOUNT_API_URL`, `SHOP_ID` | Customer Account API (login, `/account`) |
| `PRIVATE_ADMIN_API_CLIENT_ID`, `PRIVATE_ADMIN_API_CLIENT_SECRET` or `PRIVATE_ADMIN_API_TOKEN` | Server-only Admin API access (`read_metaobjects`, `write_metaobjects`) for order ratings (US-058): a Dev Dashboard app's client credentials, or a legacy custom app's token. Optional: without them ratings show as unavailable. See [docs/architecture.md → Order ratings](docs/architecture.md#order-ratings-us-058) |
| `PUBLIC_CHECKOUT_DOMAIN` | Checkout domain for analytics consent and the CSP (read in `root.tsx` and `entry.server.tsx`) |

With the Shopify CLI linked to the storefront, `npx shopify hydrogen env pull` fills `.env`.
Never commit `.env` or real tokens.

**Customer accounts locally**: the Customer Account API needs a public HTTPS domain. Follow
steps 1–2 of
[Shopify's guide](https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development).

**Sign-in** uses Shopify Customer Accounts: `/account/login` redirects to Shopify's hosted
login and `/account/authorize` completes it; the storefront keeps no passwords or identity
store of its own. Sign in with Google (US-078) is planned, not implemented; it is meant to
reuse Shopify Customer Accounts' social sign-in, configured in the Shopify admin. See
[docs/architecture.md → Customer authentication](docs/architecture.md#customer-authentication).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with GraphQL codegen |
| `npm run build` | Production build (runs codegen) |
| `npm run preview` | Build and serve the production bundle on port 3000 |
| `npm run typecheck` | Route typegen + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Unit and component tests (Vitest) |
| `npm run test:coverage` | Unit and component tests with coverage thresholds (what CI runs) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run test:staging:ratings` | Opt-in US-058 storage checks against a real staging store; never in CI (see [docs/testing.md](docs/testing.md)) |
| `npm run codegen` | Regenerate GraphQL types (`*.generated.d.ts`) and route types |

## Project structure

```
server.ts                 Oxygen worker entry
app/
  root.tsx                Root loader and HTML layout
  routes/                 Pages, actions and JSON endpoints (api.*)
  components/             UI by area: account, cart, collections, fitting-room,
                          layout, product, search, shared, try-on
  lib/                    Domain logic: catalog fragments, customization, profile,
                          recommendation, ratings, try-on, search filters, i18n,
                          session, Hydrogen context
  graphql/customer-account/  Customer Account API documents
  graphql/admin/          Admin API documents (ratings, server-only)
  styles/tailwind.css     Theme tokens
tests/unit|components|e2e
tests/staging             Opt-in checks against a real store (not in CI)
docs/                     Documentation (see below)
```

## Testing

```bash
npm test             # unit + component
npx playwright install chromium   # once
npm run test:e2e     # builds, starts preview, runs Playwright
```

CI runs lint, typecheck, unit/component tests with coverage thresholds and E2E (against
mock.shop) on every pull request and on pushes to `main`. It does not run `npm run build`.
See [docs/testing.md](docs/testing.md).

## Contributing

- **Issues**: use the templates in `.github/ISSUE_TEMPLATE/`: user story (`US-NNN`), task
  (`TASK-NNN`), bug (`BUG-NNN`) and epic (`ENN`). Tasks are sub-issues of their story.
- **Branches**: from `main`, named `<type>/<short-name>`, e.g. `feat/us-046-language-switch`,
  `fix/bug-014-metafield-lists`, `docs/...`, `chore/...`, `refactor/...`.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/), with the story
  or bug ID as scope where there is one: `feat(US-004): ...`, `fix(BUG-006): ...`.
- **Before committing**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`
  (and `npm run codegen` if GraphQL changed), and `npm run test:e2e` when it can run.
- **Pull requests**: fill in `.github/pull_request_template.md` (Summary, Task, Notes for
  reviewers). PRs need review by at least one member. See the
  [Definition of Done](docs/dod.md).
- Every push, on any branch, is deployed to Oxygen by
  `.github/workflows/oxygen-deployment-*.yml`; that workflow does not wait for the tests.

## Documentation

| Document | Contents |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Structure, data flow, "Where do I change X?", known issues |
| [docs/i18n.md](docs/i18n.md) | Languages and translations |
| [docs/responsive.md](docs/responsive.md) | Breakpoints, touch targets, mobile testing |
| [docs/testing.md](docs/testing.md) | Test layout and how to run tests |
| [docs/design.md](docs/design.md) | Domain model and design decisions |
| [docs/dod.md](docs/dod.md) | Definition of Done |
| [docs/iterations/](docs/iterations/) | Per-iteration vision, MVP, retrospective |
| [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) | Rules for AI coding agents |
