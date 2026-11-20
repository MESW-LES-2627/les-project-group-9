# MVP Specifications

The MVP milestone contains **60 user stories** across 15 epics. On 2026-11-20, 42 of them were closed on GitHub and 18 were open.

Source: GitHub issues and milestones of `MESW-LES-2627/les-project-group-9`, read on 2026-11-20 through the public REST API (all 128 issues, including closed ones). Milestone and open/closed state can change after that date; GitHub is the reference.

Source list: [MVP milestone](https://github.com/MESW-LES-2627/les-project-group-9/issues?q=is%3Aissue+milestone%3A%22MVP%22+label%3Atype%3Auser-story). The full product backlog, including Post-MVP stories, is in [vision.md](./vision.md#6-user-stories).

## How to read this document

This document keeps four things apart:

| Concept | Where it is recorded | In this document |
| --- | --- | --- |
| **Backlog / release scope** | GitHub milestones (`MVP`, `Post-MVP`) | The lists below |
| **Iteration 2 commitment** | The `Iteration` field of the GitHub Project (link in [CLAIM.md](./CLAIM.md)) | Not listed: the Project field could not be read for this update (it needs an authenticated GitHub session), so no story is claimed as committed here |
| **Implementation status** | The code on `main` | [Status notes](#status-notes), for stories where the issue state and the code differ or need context |
| **Definition of Done** | [docs/dod.md](../../dod.md), checked per story on GitHub | Not asserted here. A closed issue does not by itself show that every DoD item (for example staging verification) was met |

Each story ends with its GitHub state (`open` or `closed`) on 2026-11-20.

## E01: Catalog and navigation (#5)

- [US-001: As a shopper, I want to browse Trending, Watches, Charms, Jewelry and Custom from the header, so that I can find pieces by category](https://github.com/MESW-LES-2627/les-project-group-9/issues/22) - closed
- [US-002: As a shopper, I want to see a product grid per collection with a toolbar, so that I can scan pieces quickly](https://github.com/MESW-LES-2627/les-project-group-9/issues/23) - closed
- [US-003: As a shopper, I want to search products with predictive results, so that I find a piece fast](https://github.com/MESW-LES-2627/les-project-group-9/issues/24) - closed
- [US-004: As a shopper, I want to filter and sort a collection by material, color, price and availability, so that I can narrow the list to what I want](https://github.com/MESW-LES-2627/les-project-group-9/issues/25) - closed
- [US-005: As a shopper, I want to see badges (e.g. New, Limited) on product cards, so that I notice special pieces](https://github.com/MESW-LES-2627/les-project-group-9/issues/26) - closed
- [US-006: As a shopper, I want a home page with featured pieces, a brand story and collection tiles, so that I understand the store and where to start](https://github.com/MESW-LES-2627/les-project-group-9/issues/27) - closed
- [US-076: As a shopper, I want to browse a dedicated Trending page, so that I can discover the store's currently highlighted pieces](https://github.com/MESW-LES-2627/les-project-group-9/issues/173) - open

## E02: Product page (#6)

- [US-007: As a shopper, I want to see images, price and description on a product page, so that I can decide whether to buy](https://github.com/MESW-LES-2627/les-project-group-9/issues/28) - closed
- [US-008: As a shopper, I want to pick a variant with color swatches and see the gallery jump to its image, so that I can see the exact version I choose](https://github.com/MESW-LES-2627/les-project-group-9/issues/29) - closed
- [US-009: As a shopper, I want to see recommended products on a product page, so that I find related pieces](https://github.com/MESW-LES-2627/les-project-group-9/issues/30) - closed
- [US-010: As a shopper, I want to add a product to my cart from its page, so that I can buy it](https://github.com/MESW-LES-2627/les-project-group-9/issues/31) - closed
- [US-077: As a shopper, I want to read care instructions for a product, so that I can maintain it and avoid damaging it](https://github.com/MESW-LES-2627/les-project-group-9/issues/174) - open

## E03: 3D visualizer (#7)

- [US-011: As a shopper, I want to rotate and zoom a 3D model of a piece on its product page, so that I can inspect it from all sides](https://github.com/MESW-LES-2627/les-project-group-9/issues/32) - open
- [US-013: As a shopper, I want to see the image gallery when a product has no 3D model or the model fails to load, so that the page still works](https://github.com/MESW-LES-2627/les-project-group-9/issues/34) - open
- [US-014: As a shopper on a phone, I want to rotate the 3D model with touch, so that I can inspect it on mobile](https://github.com/MESW-LES-2627/les-project-group-9/issues/35) - open
- [US-015: As a shopper, I want product pages to open quickly even when they have a 3D model, so that I can start looking at the piece without waiting](https://github.com/MESW-LES-2627/les-project-group-9/issues/36) - open
- [US-016: As a shopper, I want to see a "3D" marker on products that have a model, so that I know which pieces I can inspect in 3D](https://github.com/MESW-LES-2627/les-project-group-9/issues/37) - open

## E04: AR try-on (#8)

- [US-017: As a shopper on a phone, I want to try a piece on with my camera (AR), so that I can see how it looks on me](https://github.com/MESW-LES-2627/les-project-group-9/issues/38) - closed
- [US-018: As a shopper, I want the Try on button to appear only when it will work, so that I do not tap a broken feature](https://github.com/MESW-LES-2627/les-project-group-9/issues/39) - closed
- [US-019: As a shopper, I want to try on several pieces together, so that I can check whether an earring matches a necklace](https://github.com/MESW-LES-2627/les-project-group-9/issues/40) - open

## E05: Fitting room (multi-piece) (#9)

- [US-020: As a shopper, I want to add a piece to the fitting room from its product page, separate from the cart, so that I can try it without buying](https://github.com/MESW-LES-2627/les-project-group-9/issues/41) - closed
- [US-021: As a shopper, I want to see all fitting room pieces together in one view, so that I can check how they look as a set](https://github.com/MESW-LES-2627/les-project-group-9/issues/42) - closed
- [US-022: As a shopper, I want to remove a piece from the fitting room or move it to the cart, so that I can manage my selection](https://github.com/MESW-LES-2627/les-project-group-9/issues/43) - closed
- [US-024: As a shopper, I want to see the number of pieces in my fitting room in the header, so that I know it has items](https://github.com/MESW-LES-2627/les-project-group-9/issues/45) - closed

## E06: Make your own (restricted) (#10)

- [US-025: As a store admin, I want to mark which products can be customized and set their allowed gem colors and engraving limits in Shopify, so that only suitable pieces get the options](https://github.com/MESW-LES-2627/les-project-group-9/issues/46) - closed
- [US-026: As a shopper, I want to add an engraving to a customizable piece, so that it is personal to me](https://github.com/MESW-LES-2627/les-project-group-9/issues/47) - open
- [US-028: As a shopper, I want to see the final price of my customized piece before I add it to the cart, so that I know what I pay](https://github.com/MESW-LES-2627/les-project-group-9/issues/49) - open
- [US-029: As a shopper, I want my engraving and gem color to appear on my order, so that the piece is made as I chose](https://github.com/MESW-LES-2627/les-project-group-9/issues/50) - open

## E07: Favorites and suggestions (#11)

- [US-030: As a shopper, I want to save or unsave a product with a heart button, so that I can keep pieces I like](https://github.com/MESW-LES-2627/les-project-group-9/issues/51) - closed
- [US-031: As a shopper, I want to see my saved products on a Favorites page, so that I can come back to them](https://github.com/MESW-LES-2627/les-project-group-9/issues/52) - closed
- [US-032: As a shopper, I want my favorites to stay saved when I come back, so that I do not lose my list](https://github.com/MESW-LES-2627/les-project-group-9/issues/53) - closed
- [US-033: As a shopper, I want to see the number of favorites in the header, so that I know my list has items](https://github.com/MESW-LES-2627/les-project-group-9/issues/54) - closed
- [US-034: As a shopper, I want to see suggested products based on my favorites, so that I discover pieces similar to what I like](https://github.com/MESW-LES-2627/les-project-group-9/issues/55) - closed

## E08: Cart and checkout (#12)

- [US-035: As a shopper, I want to open a cart drawer and update or remove items, so that I can adjust my order without leaving the page](https://github.com/MESW-LES-2627/les-project-group-9/issues/56) - closed
- [US-036: As a shopper, I want a full cart page, so that I can review my order](https://github.com/MESW-LES-2627/les-project-group-9/issues/57) - closed
- [US-037: As a shopper, I want to apply a discount code, so that I get the discount](https://github.com/MESW-LES-2627/les-project-group-9/issues/58) - closed
- [US-038: As a shopper, I want to check out through Shopify, so that I can pay securely](https://github.com/MESW-LES-2627/les-project-group-9/issues/59) - closed

## E09: Account (#13)

- [US-039: As a shopper, I want to log in and out with my Shopify customer account, so that I can access my orders](https://github.com/MESW-LES-2627/les-project-group-9/issues/60) - closed
- [US-040: As a shopper, I want to edit my first and last name, so that my account is correct](https://github.com/MESW-LES-2627/les-project-group-9/issues/61) - closed
- [US-041: As a shopper, I want to manage my saved addresses, so that checkout is faster](https://github.com/MESW-LES-2627/les-project-group-9/issues/62) - closed
- [US-042: As a shopper, I want to see my order history and order details, so that I can track what I bought](https://github.com/MESW-LES-2627/les-project-group-9/issues/63) - closed
- [US-078: As a shopper, I want to sign in with Google, so that I can access my customer account using a familiar sign-in method](https://github.com/MESW-LES-2627/les-project-group-9/issues/175) - open

## E10: Slideshow (#14)

- [US-043: As a shopper, I want to view a hero banner slideshow of the store's top-selling products and click on any product, so that I can quickly explore featured items and navigate directly to their product pages.](https://github.com/MESW-LES-2627/les-project-group-9/issues/64) - open

## E11: Content (#15)

- [US-044: As a shopper, I want to read blog articles, so that I learn about the brand and the pieces](https://github.com/MESW-LES-2627/les-project-group-9/issues/65) - open
- [US-045: As a shopper, I want to read policy and info pages, so that I know the store terms](https://github.com/MESW-LES-2627/les-project-group-9/issues/66) - closed

## E12: Language (#16)

- [US-046: As a shopper, I want to switch between Portuguese, English (US) and French, so that I can use the store in my language](https://github.com/MESW-LES-2627/les-project-group-9/issues/67) - closed
- [US-047: As a shopper, I want all text, including 3D, try-on and customization labels, in my chosen language, so that the experience is consistent](https://github.com/MESW-LES-2627/les-project-group-9/issues/68) - closed

## E13: Non-functional (#17)

- [US-048: As a shopper, I want every page to work on a phone, so that I can shop on any device](https://github.com/MESW-LES-2627/les-project-group-9/issues/69) - open
- [US-049: As a shopper, I want to still see the piece in photos when my device cannot show 3D or AR, so that I can always judge the product](https://github.com/MESW-LES-2627/les-project-group-9/issues/70) - open

## E15: Feedback and ratings (#19)

- [US-058: As a shopper, I want to give a product a star rating after I buy it, so that other shoppers know what I think](https://github.com/MESW-LES-2627/les-project-group-9/issues/79) - closed
- [US-059: As a shopper, I want to write a comment with my rating, so that I can explain my experience](https://github.com/MESW-LES-2627/les-project-group-9/issues/80) - open
- [US-060: As a shopper, I want to read other shoppers' ratings and comments on a product page, so that I can decide with more confidence](https://github.com/MESW-LES-2627/les-project-group-9/issues/81) - open

## E16: Preferences profile (#20)

- [US-064: As a shopper, I want to list my allergies, so that the store can warn me about pieces that may irritate my skin](https://github.com/MESW-LES-2627/les-project-group-9/issues/85) - closed
- [US-065: As a shopper, I want to set my skin color and undertone, so that the try-on and suggestions fit me](https://github.com/MESW-LES-2627/les-project-group-9/issues/86) - closed
- [US-066: As a shopper, I want to save my finger sizes, so that I can pick a ring size without guessing](https://github.com/MESW-LES-2627/les-project-group-9/issues/87) - closed
- [US-067: As a shopper, I want to choose my preferred colors and materials, so that the store shows pieces I like](https://github.com/MESW-LES-2627/les-project-group-9/issues/88) - closed
- [US-068: As a shopper, I want to edit or delete my preferences at any time, so that they always match what I want](https://github.com/MESW-LES-2627/les-project-group-9/issues/89) - closed
- [US-069: As a shopper, I want to see suggested pieces that fit my preferences, so that I find what suits me faster](https://github.com/MESW-LES-2627/les-project-group-9/issues/90) - closed
- [US-070: As a shopper, I want to be warned when a piece may contain one of my allergens, so that I can avoid it](https://github.com/MESW-LES-2627/les-project-group-9/issues/91) - closed
- [US-071: As a shopper, I want to export or delete my personal preferences, so that I control my data](https://github.com/MESW-LES-2627/les-project-group-9/issues/92) - closed

## Status notes

Observations from the code on `main` (merged into this branch on 2026-11-20). They describe what the code does, not whether a story's acceptance criteria or Definition of Done are met.

- **US-001 (closed):** BUG-001 (#99) is still open: the fallback header menu sends **Trending** to the home page. The dedicated page is US-076.
- **E03, US-011 to US-016 (open):** no 3D viewer exists in the code.
- **US-017, US-018, US-020 to US-022, US-024 (closed):** try-on and the fitting room work only for earring and necklace variants that have a try-on overlay in Shopify.
- **US-019 (open):** the fitting room already opens several selected pieces in one try-on session ("Try on the look"); the issue has not been closed.
- **US-026 (open):** the engraving option, its cart line attribute and the server-side check exist in the code; the issue has not been closed. **US-028 (open):** price changes for customized pieces are not implemented. **US-029 (open):** the choices are sent as cart line attributes; how they appear on the order was not verified for this document.
- **US-043 (open):** the home page has a single hero collection, not a slideshow.
- **US-044 (open):** blog routes exist from the Hydrogen template; they were not checked against the story's acceptance criteria.
- **US-058 (closed, PR #172):** implemented with the scope the project owner approved on 2026-11-20 (rating from the order page, whole order delivered, one final rating per customer + order + product, private storage, no public display); see [architecture.md: Order ratings](../../architecture.md#order-ratings-us-058). The same document records, as of 2026-11-20, that the **storage uniqueness and concurrency checks on staging (A1, A2, B4) are still pending** and are an acceptance condition, and that signed-in Playwright coverage is blocked. No later result is recorded in the repository.
- **US-059, US-060 (open):** comments and public display of ratings are not implemented. Sorting/filtering (US-061) and moderation (US-062) are Post-MVP.
- **US-064, US-070 (closed):** warnings rely on the product's allergen metafield in Shopify; products without that data show no warning.
- **US-065 (closed):** skin tone and undertone are stored. Skin tone does not affect suggestions or try-on; undertone adds a metal-based heuristic to suggestions.
- **US-076, US-077, US-078 (open, added 2026-11-20):** not implemented. Trending is defined as an editorial selection managed in Shopify; care instructions must be merchant/manufacturer-approved and consider mixed materials; Google sign-in must reuse Shopify Customer Accounts' social sign-in.
