# Vision: Jeweliette

## 1. Vision Statement

To support authentic self-expression with a personalised online destination for fashion jewelry and accessories, combining restricted product personalisation with a discovery experience shaped by each shopper's favorites and stated preferences.

## 2. Mission

Jeweliette brings some of the guidance of an in-store visit to online shopping. Shoppers can record their sizes, material sensitivities and style preferences, and the store uses that information to suggest pieces, flag possible allergen matches and help them picture pieces on themselves. Material and allergen information comes from the product data the merchant maintains in Shopify: the storefront warns and informs, it does not certify that a piece is safe for a particular person.

## 3. Product Pillars

Each pillar separates what exists in the code on `main` (as merged on 2026-11-20) from what is roadmap. Story status is in [Section 6](#6-user-stories) and [mvp.md](./mvp.md); technical detail is in [docs/architecture.md](../../architecture.md).

### Personalisation within defined limits

- **Restricted customization (E06):** on products the merchant marks as customizable, the shopper can pick a gem colour from a list set in the Shopify admin and add an engraving up to a set length (at most 40 characters). There is no free choice of metals, stones or settings. Price changes for customized pieces (US-028) are not implemented.
- **Custom design builder (E14, Post-MVP):** building a piece from a base, metal, chain, gems and charms (US-050 to US-057) is roadmap only.
- **Multi-piece styling:** the fitting room keeps variants that support try-on and opens them together as one look. Today this covers earrings and necklaces only; rings, bracelets and watches cannot be tried on.
- **Front-camera try-on (E04):** on a phone, earrings and necklaces with a transparent overlay image are drawn on the live camera image using face landmarks, with a photo fallback; computers show a QR code. It is not AR surface placement, and only variants the merchant has prepared are supported.

### Preference-aware discovery

- **Preference profile (E16):** allergies, skin tone and undertone, ring sizes per finger, and preferred materials, colours and gemstones, stored in the customer's Shopify account. Shoppers can edit, export and delete it.
- **Suggestions (E07, E16):** based on favorites and preferences. Products matching a declared allergy are left out of suggestions. Undertone contributes through a simple metal heuristic (gold: warm, silver: cool). **Skin tone is stored but does not currently change suggestions or try-on.**
- **Allergen warnings:** a badge and a confirmation before adding to the bag when the product's allergen data in Shopify matches the shopper's allergies. A product without allergen data shows no warning, so the absence of a warning is not a guarantee.
- **Ring sizes:** saved sizes and a size guide on ring products help choose a size; they do not guarantee fit.

### A boutique-style service online

- **Languages (E12):** English (US), European Portuguese and French for the interface; catalog content is translated in Shopify.
- **Ratings (E15):** verified buyers can rate each product of a fully delivered order (US-058), stored privately. Showing ratings to other shoppers (US-060), comments (US-059), sorting and filtering (US-061) and moderation (US-062) are separate stories and not implemented.
- **Planned MVP additions (open):** a dedicated Trending page that shows an editorial selection managed in Shopify (US-076), merchant- or manufacturer-approved care instructions that account for mixed materials (US-077), and Sign in with Google through Shopify Customer Accounts (US-078).
- **Post-MVP:** an immersive, scroll-based product presentation (US-079) and an interactive homepage hero (US-080). Animation libraries such as Lenis or GSAP are options to evaluate, not committed dependencies.

## 4. Product Principles

1. **Inform, do not overpromise:** personalisation, warnings and size help support the shopper's decision. They depend on the data the merchant maintains and never guarantee fit or the absence of an allergen.
2. **Experiment within supported options:** tools such as the fitting room and customization encourage combining and personalising pieces, within the options the merchant has prepared.
3. **Elegance that does not get in the way:** visual effects and motion stay optional; buying, accessibility and reduced-motion preferences come first.

## 5. Value Proposition Summary

The outcomes are intended, not measured.

| Target audience need | Jeweliette response | Intended outcome |
| :--- | :--- | :--- |
| Worry about metal allergies and ring sizing | Allergy profile with warnings based on product data, saved ring sizes and a size guide | Better-informed purchases and fewer avoidable returns |
| Hard to picture several pieces together | Fitting room and front-camera try-on for earrings and necklaces | More confidence when combining pieces |
| Generic catalogue browsing | Suggestions from favorites and preferences; an editorial Trending selection (planned) | Faster discovery of suitable pieces |

## 6. User Stories

All **80 user stories** (US-001 to US-080) are listed below, grouped by epic: **60 are in the MVP milestone and 20 in the Post-MVP milestone**. Milestones describe release scope only; they are not the iteration commitment or the implementation status (see [mvp.md](./mvp.md)).

Source: GitHub issues and milestones of `MESW-LES-2627/les-project-group-9`, read on 2026-11-20 through the public REST API (all 128 issues, including closed ones). Milestone and open/closed state can change after that date; GitHub is the reference. US-076 to US-080 (#173 to #177) were added to the backlog on 2026-11-20.

The MVP scope only is in [mvp.md](./mvp.md).

### E01: Catalog and navigation (#5)

- [US-001: As a shopper, I want to browse Trending, Watches, Charms, Jewelry and Custom from the header, so that I can find pieces by category](https://github.com/MESW-LES-2627/les-project-group-9/issues/22) - MVP
- [US-002: As a shopper, I want to see a product grid per collection with a toolbar, so that I can scan pieces quickly](https://github.com/MESW-LES-2627/les-project-group-9/issues/23) - MVP
- [US-003: As a shopper, I want to search products with predictive results, so that I find a piece fast](https://github.com/MESW-LES-2627/les-project-group-9/issues/24) - MVP
- [US-004: As a shopper, I want to filter and sort a collection by material, color, price and availability, so that I can narrow the list to what I want](https://github.com/MESW-LES-2627/les-project-group-9/issues/25) - MVP
- [US-005: As a shopper, I want to see badges (e.g. New, Limited) on product cards, so that I notice special pieces](https://github.com/MESW-LES-2627/les-project-group-9/issues/26) - MVP
- [US-006: As a shopper, I want a home page with featured pieces, a brand story and collection tiles, so that I understand the store and where to start](https://github.com/MESW-LES-2627/les-project-group-9/issues/27) - MVP
- [US-076: As a shopper, I want to browse a dedicated Trending page, so that I can discover the store's currently highlighted pieces](https://github.com/MESW-LES-2627/les-project-group-9/issues/173) - MVP

### E02: Product page (#6)

- [US-007: As a shopper, I want to see images, price and description on a product page, so that I can decide whether to buy](https://github.com/MESW-LES-2627/les-project-group-9/issues/28) - MVP
- [US-008: As a shopper, I want to pick a variant with color swatches and see the gallery jump to its image, so that I can see the exact version I choose](https://github.com/MESW-LES-2627/les-project-group-9/issues/29) - MVP
- [US-009: As a shopper, I want to see recommended products on a product page, so that I find related pieces](https://github.com/MESW-LES-2627/les-project-group-9/issues/30) - MVP
- [US-010: As a shopper, I want to add a product to my cart from its page, so that I can buy it](https://github.com/MESW-LES-2627/les-project-group-9/issues/31) - MVP
- [US-077: As a shopper, I want to read care instructions for a product, so that I can maintain it and avoid damaging it](https://github.com/MESW-LES-2627/les-project-group-9/issues/174) - MVP
- [US-079: As a shopper, I want to explore a product through an immersive scrolling presentation, so that I can understand its design and details more clearly](https://github.com/MESW-LES-2627/les-project-group-9/issues/176) - Post-MVP

### E03: 3D visualizer (#7)

- [US-011: As a shopper, I want to rotate and zoom a 3D model of a piece on its product page, so that I can inspect it from all sides](https://github.com/MESW-LES-2627/les-project-group-9/issues/32) - MVP
- [US-012: As a shopper, I want the 3D model to show the color or metal I selected, so that I see the version I chose](https://github.com/MESW-LES-2627/les-project-group-9/issues/33) - Post-MVP
- [US-013: As a shopper, I want to see the image gallery when a product has no 3D model or the model fails to load, so that the page still works](https://github.com/MESW-LES-2627/les-project-group-9/issues/34) - MVP
- [US-014: As a shopper on a phone, I want to rotate the 3D model with touch, so that I can inspect it on mobile](https://github.com/MESW-LES-2627/les-project-group-9/issues/35) - MVP
- [US-015: As a shopper, I want product pages to open quickly even when they have a 3D model, so that I can start looking at the piece without waiting](https://github.com/MESW-LES-2627/les-project-group-9/issues/36) - MVP
- [US-016: As a shopper, I want to see a "3D" marker on products that have a model, so that I know which pieces I can inspect in 3D](https://github.com/MESW-LES-2627/les-project-group-9/issues/37) - MVP

### E04: AR try-on (#8)

- [US-017: As a shopper on a phone, I want to try a piece on with my camera (AR), so that I can see how it looks on me](https://github.com/MESW-LES-2627/les-project-group-9/issues/38) - MVP
- [US-018: As a shopper, I want the Try on button to appear only when it will work, so that I do not tap a broken feature](https://github.com/MESW-LES-2627/les-project-group-9/issues/39) - MVP
- [US-019: As a shopper, I want to try on several pieces together, so that I can check whether an earring matches a necklace](https://github.com/MESW-LES-2627/les-project-group-9/issues/40) - MVP

### E05: Fitting room (multi-piece) (#9)

- [US-020: As a shopper, I want to add a piece to the fitting room from its product page, separate from the cart, so that I can try it without buying](https://github.com/MESW-LES-2627/les-project-group-9/issues/41) - MVP
- [US-021: As a shopper, I want to see all fitting room pieces together in one view, so that I can check how they look as a set](https://github.com/MESW-LES-2627/les-project-group-9/issues/42) - MVP
- [US-022: As a shopper, I want to remove a piece from the fitting room or move it to the cart, so that I can manage my selection](https://github.com/MESW-LES-2627/les-project-group-9/issues/43) - MVP
- [US-023: As a shopper, I want my fitting room to stay when I come back later on any device, so that I do not have to rebuild the set](https://github.com/MESW-LES-2627/les-project-group-9/issues/44) - Post-MVP
- [US-024: As a shopper, I want to see the number of pieces in my fitting room in the header, so that I know it has items](https://github.com/MESW-LES-2627/les-project-group-9/issues/45) - MVP

### E06: Make your own (restricted) (#10)

- [US-025: As a store admin, I want to mark which products can be customized and set their allowed gem colors and engraving limits in Shopify, so that only suitable pieces get the options](https://github.com/MESW-LES-2627/les-project-group-9/issues/46) - MVP
- [US-026: As a shopper, I want to add an engraving to a customizable piece, so that it is personal to me](https://github.com/MESW-LES-2627/les-project-group-9/issues/47) - MVP
- [US-027: As a shopper, I want to change the gem color of a customizable piece and see it on the 3D model, so that I can choose the look I want](https://github.com/MESW-LES-2627/les-project-group-9/issues/48) - Post-MVP
- [US-028: As a shopper, I want to see the final price of my customized piece before I add it to the cart, so that I know what I pay](https://github.com/MESW-LES-2627/les-project-group-9/issues/49) - MVP
- [US-029: As a shopper, I want my engraving and gem color to appear on my order, so that the piece is made as I chose](https://github.com/MESW-LES-2627/les-project-group-9/issues/50) - MVP

### E07: Favorites and suggestions (#11)

- [US-030: As a shopper, I want to save or unsave a product with a heart button, so that I can keep pieces I like](https://github.com/MESW-LES-2627/les-project-group-9/issues/51) - MVP
- [US-031: As a shopper, I want to see my saved products on a Favorites page, so that I can come back to them](https://github.com/MESW-LES-2627/les-project-group-9/issues/52) - MVP
- [US-032: As a shopper, I want my favorites to stay saved when I come back, so that I do not lose my list](https://github.com/MESW-LES-2627/les-project-group-9/issues/53) - MVP
- [US-033: As a shopper, I want to see the number of favorites in the header, so that I know my list has items](https://github.com/MESW-LES-2627/les-project-group-9/issues/54) - MVP
- [US-034: As a shopper, I want to see suggested products based on my favorites, so that I discover pieces similar to what I like](https://github.com/MESW-LES-2627/les-project-group-9/issues/55) - MVP

### E08: Cart and checkout (#12)

- [US-035: As a shopper, I want to open a cart drawer and update or remove items, so that I can adjust my order without leaving the page](https://github.com/MESW-LES-2627/les-project-group-9/issues/56) - MVP
- [US-036: As a shopper, I want a full cart page, so that I can review my order](https://github.com/MESW-LES-2627/les-project-group-9/issues/57) - MVP
- [US-037: As a shopper, I want to apply a discount code, so that I get the discount](https://github.com/MESW-LES-2627/les-project-group-9/issues/58) - MVP
- [US-038: As a shopper, I want to check out through Shopify, so that I can pay securely](https://github.com/MESW-LES-2627/les-project-group-9/issues/59) - MVP

### E09: Account (#13)

- [US-039: As a shopper, I want to log in and out with my Shopify customer account, so that I can access my orders](https://github.com/MESW-LES-2627/les-project-group-9/issues/60) - MVP
- [US-040: As a shopper, I want to edit my first and last name, so that my account is correct](https://github.com/MESW-LES-2627/les-project-group-9/issues/61) - MVP
- [US-041: As a shopper, I want to manage my saved addresses, so that checkout is faster](https://github.com/MESW-LES-2627/les-project-group-9/issues/62) - MVP
- [US-042: As a shopper, I want to see my order history and order details, so that I can track what I bought](https://github.com/MESW-LES-2627/les-project-group-9/issues/63) - MVP
- [US-078: As a shopper, I want to sign in with Google, so that I can access my customer account using a familiar sign-in method](https://github.com/MESW-LES-2627/les-project-group-9/issues/175) - MVP

### E10: Slideshow (#14)

- [US-043: As a shopper, I want to view a hero banner slideshow of the store's top-selling products and click on any product, so that I can quickly explore featured items and navigate directly to their product pages.](https://github.com/MESW-LES-2627/les-project-group-9/issues/64) - MVP
- [US-080: As a shopper, I want an interactive homepage hero, so that I can discover the brand and featured pieces through an engaging introduction](https://github.com/MESW-LES-2627/les-project-group-9/issues/177) - Post-MVP

### E11: Content (#15)

- [US-044: As a shopper, I want to read blog articles, so that I learn about the brand and the pieces](https://github.com/MESW-LES-2627/les-project-group-9/issues/65) - MVP
- [US-045: As a shopper, I want to read policy and info pages, so that I know the store terms](https://github.com/MESW-LES-2627/les-project-group-9/issues/66) - MVP

### E12: Language (#16)

- [US-046: As a shopper, I want to switch between Portuguese, English (US) and French, so that I can use the store in my language](https://github.com/MESW-LES-2627/les-project-group-9/issues/67) - MVP
- [US-047: As a shopper, I want all text, including 3D, try-on and customization labels, in my chosen language, so that the experience is consistent](https://github.com/MESW-LES-2627/les-project-group-9/issues/68) - MVP

### E13: Non-functional (#17)

- [US-048: As a shopper, I want every page to work on a phone, so that I can shop on any device](https://github.com/MESW-LES-2627/les-project-group-9/issues/69) - MVP
- [US-049: As a shopper, I want to still see the piece in photos when my device cannot show 3D or AR, so that I can always judge the product](https://github.com/MESW-LES-2627/les-project-group-9/issues/70) - MVP

### E14: Custom design builder (#18)

- [US-050: As a shopper, I want to choose a base piece (ring, necklace, earrings, bracelet, watch) to start my design, so that I can build from a shape I like](https://github.com/MESW-LES-2627/les-project-group-9/issues/71) - Post-MVP
- [US-051: As a shopper, I want to choose the metal for my design, so that the piece matches my style](https://github.com/MESW-LES-2627/les-project-group-9/issues/72) - Post-MVP
- [US-052: As a shopper, I want to choose the cord or chain for my design, so that the length and look fit me](https://github.com/MESW-LES-2627/les-project-group-9/issues/73) - Post-MVP
- [US-053: As a shopper, I want to choose gems and where they sit on the piece, so that I can make the design my own](https://github.com/MESW-LES-2627/les-project-group-9/issues/74) - Post-MVP
- [US-054: As a shopper, I want to add charms to my design, so that the piece tells my story](https://github.com/MESW-LES-2627/les-project-group-9/issues/75) - Post-MVP
- [US-055: As a shopper, I want to see my design in 3D as I build it, so that I know how it will look](https://github.com/MESW-LES-2627/les-project-group-9/issues/76) - Post-MVP
- [US-056: As a shopper, I want to see the total price of my design as I build it, so that I know what I pay](https://github.com/MESW-LES-2627/les-project-group-9/issues/77) - Post-MVP
- [US-057: As a shopper, I want to save my design and add it to my cart, so that I can buy it later or now](https://github.com/MESW-LES-2627/les-project-group-9/issues/78) - Post-MVP

### E15: Feedback and ratings (#19)

- [US-058: As a shopper, I want to give a product a star rating after I buy it, so that other shoppers know what I think](https://github.com/MESW-LES-2627/les-project-group-9/issues/79) - MVP
- [US-059: As a shopper, I want to write a comment with my rating, so that I can explain my experience](https://github.com/MESW-LES-2627/les-project-group-9/issues/80) - MVP
- [US-060: As a shopper, I want to read other shoppers' ratings and comments on a product page, so that I can decide with more confidence](https://github.com/MESW-LES-2627/les-project-group-9/issues/81) - MVP
- [US-061: As a shopper, I want to sort and filter reviews, so that I find the ones that matter to me](https://github.com/MESW-LES-2627/les-project-group-9/issues/82) - Post-MVP
- [US-062: As a store admin, I want to approve or hide reviews before they are shown, so that the store stays appropriate](https://github.com/MESW-LES-2627/les-project-group-9/issues/83) - Post-MVP
- [US-063: As a shopper, I want to send feedback about the store, so that the team can improve it](https://github.com/MESW-LES-2627/les-project-group-9/issues/84) - Post-MVP

### E16: Preferences profile (#20)

- [US-064: As a shopper, I want to list my allergies, so that the store can warn me about pieces that may irritate my skin](https://github.com/MESW-LES-2627/les-project-group-9/issues/85) - MVP
- [US-065: As a shopper, I want to set my skin color and undertone, so that the try-on and suggestions fit me](https://github.com/MESW-LES-2627/les-project-group-9/issues/86) - MVP
- [US-066: As a shopper, I want to save my finger sizes, so that I can pick a ring size without guessing](https://github.com/MESW-LES-2627/les-project-group-9/issues/87) - MVP
- [US-067: As a shopper, I want to choose my preferred colors and materials, so that the store shows pieces I like](https://github.com/MESW-LES-2627/les-project-group-9/issues/88) - MVP
- [US-068: As a shopper, I want to edit or delete my preferences at any time, so that they always match what I want](https://github.com/MESW-LES-2627/les-project-group-9/issues/89) - MVP
- [US-069: As a shopper, I want to see suggested pieces that fit my preferences, so that I find what suits me faster](https://github.com/MESW-LES-2627/les-project-group-9/issues/90) - MVP
- [US-070: As a shopper, I want to be warned when a piece may contain one of my allergens, so that I can avoid it](https://github.com/MESW-LES-2627/les-project-group-9/issues/91) - MVP
- [US-071: As a shopper, I want to export or delete my personal preferences, so that I control my data](https://github.com/MESW-LES-2627/les-project-group-9/issues/92) - MVP

### E17: Chatbot (#21)

- [US-072: As a shopper, I want to ask the chatbot about products, so that I can find what I need without browsing everything](https://github.com/MESW-LES-2627/les-project-group-9/issues/93) - Post-MVP
- [US-073: As a shopper, I want to ask the chatbot about sizing, shipping, returns and orders, so that I get answers fast](https://github.com/MESW-LES-2627/les-project-group-9/issues/94) - Post-MVP
- [US-074: As a shopper, I want to talk to a person when the chatbot cannot help, so that my problem gets solved](https://github.com/MESW-LES-2627/les-project-group-9/issues/95) - Post-MVP
- [US-075: As a shopper, I want to see my past chatbot conversations, so that I do not repeat myself](https://github.com/MESW-LES-2627/les-project-group-9/issues/96) - Post-MVP
