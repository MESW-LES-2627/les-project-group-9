# Jeweliette — agent guide

@AGENTS.md

Jeweliette is a headless Shopify storefront for a fashion jewelry and accessories brand, built
on Hydrogen (React Router 7, React 18, TypeScript, Tailwind CSS 4) and deployed
to Oxygen. This file holds the standing rules for every session. Details live in:

- [docs/architecture.md](docs/architecture.md): structure, data flow, "Where do I change X?", known issues
- [docs/i18n.md](docs/i18n.md): languages and translations
- [docs/responsive.md](docs/responsive.md): breakpoints, touch targets, mobile testing
- [docs/testing.md](docs/testing.md): test layout and how to run the tests
- [docs/dod.md](docs/dod.md): Definition of Done
- [README.md](README.md): setup and contribution workflow

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 (also runs codegen) |
| `npm run build` | Production build (also runs codegen) |
| `npm run preview` | Build and serve the production bundle |
| `npm run typecheck` | `react-router typegen` + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest: unit (node) and component (jsdom) projects |
| `npm run test:coverage` | `npm test` with coverage thresholds (what CI runs) |
| `npm run test:e2e` | Playwright, desktop Chromium, against `npm run preview` |
| `npm run codegen` | Regenerate GraphQL and route types |
| `npm run test:staging:ratings` | Opt-in US-058 storage checks against a real staging store (never in CI; writes only with `RATINGS_STAGING_CONFIRM_WRITES`) |

## Verification before every commit

1. `npm run codegen`: only if a GraphQL document changed. Commit the regenerated `*.generated.d.ts`.
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build`
6. `npm run test:e2e` when it can run here (it needs a `.env`; CI uses `PUBLIC_STORE_DOMAIN=mock.shop`).
   If it cannot run, say so. Never claim it passed.

## Folder map

```
server.ts                  Oxygen worker entry: builds the Hydrogen context, handles the request
app/root.tsx               Root loader (header, footer, cart, login state), <html> layout, error boundary
app/routes/                File-based routes (@react-router/fs-routes); api.* are JSON endpoints
app/components/<group>/    UI grouped by area: account, cart, collections, fitting-room,
                           layout, product, search, shared, try-on (+ RichText.tsx)
app/lib/                   Domain logic and utilities (pure where possible)
  context.ts, session.ts, i18n.ts     Hydrogen context, cookie session, locale + translator
  messages/{en,pt,fr}.ts              UI dictionaries (en defines the keys)
  response.server.ts                  Final response headers (session cookie, Vary)
  jeweliette-catalog.ts               Shared product fragments and catalog types
  profile/                            Favorites, fitting room, preferences (customer metafields)
  recommendation/                     Recommendation engine (pure) + candidate loader
  try-on/                             Front-camera try-on: catalog gate, geometry, device detection
  search.ts                           Filter parsing shared by collections and search
  ratings/                            Order ratings (US-058): delivery rule, validation,
                                      eligibility loader, Admin API rating store
  request-origin.server.ts            Same-origin check for cookie-authenticated writes
app/graphql/customer-account/  Customer Account API documents
app/graphql/admin/         Admin API documents (no codegen; server-only)
app/assets/                logo.svg and models/face_landmarker.task (imported with `?url`)
app/styles/tailwind.css    Tailwind 4 theme tokens (colors, fonts, breakpoints, shadows)
public/                    Remaining static files (none required at runtime)
tests/{unit,components,e2e}/
tests/staging/             Opt-in checks against a real store (never in CI)
docs/                      Technical and process documentation
```

See [docs/architecture.md](docs/architecture.md) for the full picture.

## Standing rules

**Structure**
- Keep code modular: small single-purpose components and functions. Business logic goes in
  `app/lib/` (pure, testable), presentation in `app/components/`, data loading in route
  loaders and actions. No business logic inside JSX.
- Reuse before creating. Search for existing components, utilities and GraphQL fragments
  first (e.g. `JEWELIETTE_PRODUCT_CARD_FRAGMENT` in `app/lib/jeweliette-catalog.ts`).
  Never duplicate code; extend or generalise an existing module instead of adding a parallel
  one. Create a new file only when it has a clear single responsibility.
- Components are modular and composable, with typed props and no hidden global state.
  Follow the existing grouping in `app/components/`.

**Code quality**
- Write concise JSDoc/TSDoc for exported functions and components. Comment only where the
  "why" is not obvious; no comments that restate the code.
- TypeScript strict: no `any` unless justified in a comment; no non-null assertions to
  silence errors.
- Never edit `*.generated.d.ts`. Run `npm run codegen` after changing GraphQL.
- Do not add dependencies without explaining why to the user; prefer what is installed.

**Content and language**
- Never hardcode a language in queries or UI. Let `context.storefront.i18n` supply
  `$language`/`$country`.
- **Every user-visible string goes through the translation layer**: JSX text, button
  labels, `aria-label`/`title`/`alt`/`placeholder`, empty states, validation and error
  messages shown to users, and `meta` titles. Add the key to `app/lib/messages/en.ts`,
  `pt.ts` and `fr.ts` (all three required) and use `useTranslation()`, `translatorFor()` or
  `translatorFromMatches()`. Logic in `app/lib` returns codes, not display text.
  `npm run lint` rejects literal JSX text and literal `aria-label`/`title`/`alt`/`placeholder`
  values; `messages.test.ts` rejects unused keys.
- Format prices with `components/shared/Money.tsx` (not Hydrogen's `<Money>`), dates with
  `formatDate()`, lists with `formatList()`, counts with plural messages.
- Do not translate identifiers (handles, IDs, enum values, cookie values) or Shopify
  content; Shopify content is translated in the Shopify admin. See [docs/i18n.md](docs/i18n.md).
- Never hardcode shop-specific handles or product data.

**Styling and accessibility**
- Tailwind utility classes using the theme tokens in `app/styles/tailwind.css`. Mobile-first.
  No new CSS files unless unavoidable. Follow [docs/responsive.md](docs/responsive.md).
- Semantic HTML, labels for every control, visible focus, full keyboard support, touch
  targets of at least 44x44 CSS px. Check the computed size: the root font is 14px, so
  `size-11` is only 38.5px (see docs/responsive.md). No behaviour that depends on `:hover`.

**Tests**
- Behaviour changes come with tests: unit tests for `app/lib/`, component tests for
  interactive components, E2E for critical flows. Never weaken or delete existing tests to
  make them pass. E2E tests must not assert product names or prices.

**Security**
- No secrets in code, logs or commits (`.env` is git-ignored; see `.env.example`).
- Validate and sanitise user input on the server. Never render untrusted HTML.
- Redirect targets taken from user input must be same-origin paths.

**Documentation**
- Documentation is part of the change. When structure, behaviour, routes, data flow,
  commands or conventions change, update the relevant file in `docs/`, `README.md` and
  this file in the same commit.

**Process**
- Branches: `feat/`, `fix/`, `bug/`, `chore/`, `docs/`, `refactor/`, `test/` + short name
  (e.g. `feat/us-046-language-switch`).
- Conventional Commits with the story or bug ID as scope: `feat(US-046): ...`,
  `fix(BUG-014): ...`. Reference story IDs, not issue numbers; no closing keywords.
- One focused commit per logical change. Do not push or open PRs unless asked; PR text
  follows `.github/pull_request_template.md` (Summary, Task, Notes for reviewers).
- If a requirement is ambiguous, or prerequisite work is missing, stop and ask instead of
  guessing.
