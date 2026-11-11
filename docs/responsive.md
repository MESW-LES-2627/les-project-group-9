# Responsive design

Every page must work on a phone (story **US-048**). This page holds the rules and the
audit. The audit table is filled in by US-048.

## Breakpoints

Tailwind 4 defaults plus two custom breakpoints from the `@theme` block in
`app/styles/tailwind.css`. Breakpoints are `min-width` media queries. Media queries resolve
`rem` against the browser default (16px), not the 14px root font size.

| Prefix | Defined as | Width | Use in this codebase |
| --- | --- | --- | --- |
| *(none)* | — | 0+ | Mobile-first base styles |
| `xs` | `27rem` (custom) | 432px | Large phones (used once) |
| `sm` | `40rem` | 640px | Small tablets / landscape phones |
| `md` | `48rem` | 768px | Tablets |
| `tablet` | `50rem` (custom) | 800px | Header switches from mobile menu to desktop navigation |
| `lg` | `64rem` | 1024px | Desktop grids |
| `xl` | `80rem` | 1280px | Wide desktop |

The root font size is 87.5% (14px), and 93.75% at 1700px and up (`app/styles/tailwind.css`).
`rem`-based sizes (`text-base`, `p-4`, `min-h-11`) are therefore 12.5% smaller than
Tailwind's documented pixel values. For example, `min-h-11` is 38.5px, not 44px. This
affects touch targets and input font sizes; US-048 addresses it.

## Rules

- **Mobile-first**: write base classes for phones and add `sm:`/`tablet:`/`lg:` upwards.
  Use the existing breakpoints; do not add a second layout system.
- **Fix it in the shared component** (header, `Aside`, cart, `ProductItem`,
  `CatalogFilters`, `PaginatedResourceSection`) rather than patching each page.
- **Touch targets** must be at least 44×44 CSS px, including icon buttons, swatches,
  quantity steppers and close buttons. Check the computed size given the 14px root.
- **No hover-only interactions**: anything revealed or triggered on `:hover` needs a touch
  and keyboard path. Give clear `:active` and `:focus-visible` states.
- **Inputs at 16px or more**: iOS Safari zooms the page when an input below 16px is focused.
- **No horizontal overflow** at 360px. Wide content (tables, galleries, filter bars) scrolls
  inside its own container (`overflow-x-auto`); the page does not scroll sideways. Examples
  already in the code: the order table in `account.orders.$id.tsx` and tables in `RichText`.
- **Fixed and sticky elements** (the sticky header, asides/drawers, dialogs) must not cover
  content or actions. Use `dvh`/`svh` units for full-height panels.
- **Dropdowns and popovers** (filters, sort) stay within the viewport.
- **Longer text**: Portuguese strings are usually longer than English. Layouts must wrap
  rather than truncate or overflow, so check in both languages.

## How to test on mobile

1. **Browser devtools**: device toolbar at 360, 375, 390 and 768px wide, plus 1280px to catch
   desktop regressions. Enable touch simulation.
2. **Real device on the local network**: `npm run dev -- --host` exposes the dev server.
   That flag is passed through to the Shopify CLI and was not tested (**unverified**).
   Customer-account flows need the public-domain setup described in the README.
3. **Playwright**: there is no mobile project yet. `tests/e2e/footer.spec.ts` shows the
   per-test pattern (`page.setViewportSize({width: 375, height: 812})`). US-048 adds mobile
   checks for the critical flow.
4. **Checks per page**: no horizontal scrollbar; header, menu, search, cart drawer and footer
   usable; every button reachable by touch and keyboard; forms usable with the on-screen keyboard.

## Audit (US-048)

To be filled in by US-048: every route and the shared layout at 360/375/390/768/1280px, in
EN and PT.

| Page / component | Width(s) | Issue found | Fix |
| --- | --- | --- | --- |
| — | — | — | — |

Known items before the audit (see [architecture.md → Known issues](architecture.md#known-issues)):
- Inputs styled `text-base` render at 14px because of the root font size.
- Header favorites and fitting-room links are `h-10 w-10` (40px nominal, 35px computed).
- `size-11`/`min-h-11`, used throughout as the "44px" target, compute to 38.5px.
