# Jeweliette

Jeweliette is a headless e-commerce storefront for a fashion-jewelry brand. It is built with
[Shopify Hydrogen](https://shopify.dev/docs/storefronts/headless/hydrogen) and deployed to
Shopify Oxygen. Besides the usual catalog, search, cart and customer account, it offers:

- **Favorites** and a **fitting room** saved to the customer's account
- A **preference profile**: allergies, skin tone and undertone, ring sizes, preferred
  materials, colours and gemstones
- **Personalised recommendations** based on favorites and preferences
- **Allergen warnings** before adding a piece to the bag, and a ring-size guide

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
| `PUBLIC_CHECKOUT_DOMAIN` | Checkout domain for analytics consent and the CSP. Read in `root.tsx` and `entry.server.tsx`, but missing from `.env.example` |

With the Shopify CLI linked to the storefront, `npx shopify hydrogen env pull` fills `.env`.
Never commit `.env` or real tokens.

**Customer accounts locally**: the Customer Account API needs a public HTTPS domain. Follow
steps 1–2 of
[Shopify's guide](https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with GraphQL codegen |
| `npm run build` | Production build (runs codegen) |
| `npm run preview` | Build and serve the production bundle on port 3000 |
| `npm run typecheck` | Route typegen + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Unit and component tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run codegen` | Regenerate GraphQL types (`*.generated.d.ts`) and route types |

## Project structure

```
server.ts                 Oxygen worker entry
app/
  root.tsx                Root loader and HTML layout
  routes/                 Pages, actions and JSON endpoints (api.*)
  components/             UI by area: account, cart, collections, fitting-room,
                          layout, product, search, shared
  lib/                    Domain logic: catalog fragments, profile, recommendation,
                          search filters, i18n, session, Hydrogen context
  graphql/customer-account/  Customer Account API documents
  styles/tailwind.css     Theme tokens
tests/unit|components|e2e
docs/                     Documentation (see below)
```

## Testing

```bash
npm test             # unit + component
npx playwright install chromium   # once
npm run test:e2e     # builds, starts preview, runs Playwright
```

CI runs lint, typecheck, unit/component tests and E2E (against mock.shop) on every pull
request. See [docs/testing.md](docs/testing.md).

## Contributing

- **Issues**: use the templates in `.github/ISSUE_TEMPLATE/`: user story (`US-NNN`), task
  (`TASK-NNN`), bug (`BUG-NNN`) and epic (`ENN`). Tasks are sub-issues of their story.
- **Branches**: from `main`, named `<type>/<short-name>`, e.g. `feat/us-046-language-switch`,
  `fix/bug-014-metafield-lists`, `docs/...`, `chore/...`, `refactor/...`.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/), with the story
  or bug ID as scope where there is one: `feat(US-004): ...`, `fix(BUG-006): ...`.
- **Before committing**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`
  (and `npm run codegen` if GraphQL changed).
- **Pull requests**: fill in `.github/pull_request_template.md` (Summary, Task, Notes for
  reviewers). PRs need review by at least one member. See the
  [Definition of Done](docs/dod.md).
- Every push is deployed to Oxygen by `.github/workflows/oxygen-deployment-*.yml`.

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
