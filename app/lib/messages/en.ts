/**
 * English UI messages: the reference catalogue. Its keys define `MessageKey`
 * and each message's shape; `pt.ts` and `fr.ts` must provide every key with
 * the same shape, so a missing key fails the typecheck.
 *
 * Keys are grouped by module with a prefix (`nav.`, `cart.`, `product.`…).
 * A message is a string or, when it depends on a `count` value, an object of
 * Intl.PluralRules categories (`other` required). Placeholders use `{name}`.
 * See docs/i18n.md → UI messages.
 */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};

export const en = {
  'language.label': 'Language',
  'language.current': 'Current language: {language}',

  'nav.skipToContent': 'Skip to content',
  'nav.main': 'Main navigation',
  'nav.mobile': 'Mobile menu',
  'nav.accountActions': 'Account actions',
  'nav.home': 'Home',
  'nav.homeOf': '{shop} — home',
  'nav.openMenu': 'Open menu',
  'nav.menu': 'Menu',
  'nav.search': 'Search',
  'nav.account': 'Account',
  'nav.myAccount': 'My account',
  'nav.favorites': 'Favorites',
  'nav.fittingRoom': 'Fitting room',
  'nav.shoppingBag': 'Shopping bag',
  'nav.openCart': {
    one: 'Open cart with {count} item',
    other: 'Open cart with {count} items',
  },
  'nav.close': 'Close',
  'nav.closePanel': 'Close panel',

  // Shared
  'common.allPieces': 'All pieces',
  'common.collections': 'Collections',
  'common.loading': 'Loading…',
  'common.loadPrevious': 'Load previous',
  'common.loadMore': 'Load more',
  'common.closeDialog': 'Close dialog',

  // Layout: announcement bar and fallback header menu
  'layout.announcement': 'Free shipping on orders over €100',
  'layout.tagline': 'Made to last',
  'menu.trending': 'Trending',
  'menu.watches': 'Watches',
  'menu.charms': 'Charms',
  'menu.jewelry': 'Jewelry',

  // Footer
  'footer.tagline': 'Modern jewelry to layer, gift and keep.',
  'footer.discover': 'Discover',
  'footer.information': 'Information',
  'footer.newsletterTitle': 'Stories in your inbox',
  'footer.newsletterText': 'News, style guides and early access.',
  'footer.email': 'Email address',
  'footer.newsletterSoon': 'Newsletter coming soon',
  'footer.subscribe': 'Subscribe to newsletter',
  'footer.signature': 'Designed to be kept',
  'policy.privacy': 'Privacy policy',
  'policy.refund': 'Refund policy',
  'policy.shipping': 'Shipping policy',
  'policy.terms': 'Terms of service',

  // Search
  'search.title': 'Search Jeweliette',
  'search.placeholder': 'What are you looking for?',
  'search.inputLabel': 'Search products',
  'search.seeAll': 'See all results',
  'search.searching': 'Searching…',
  'search.explore': 'Explore',
  'search.noResults': 'No results',
  'search.tryAnotherTerm': 'Try another term for “{term}”.',
  'search.noResultsFor': 'No results found for “{term}”',
  'search.unavailable': 'Search is temporarily unavailable. Please try again.',
  'search.prompt': 'Search for a piece, material or collection.',
  'search.noFilteredProducts':
    'No products match your search and selected filters.',
  'search.articles': 'Articles',
  'search.pages': 'Pages',
  'search.pieces': 'Pieces',
  'search.tryAnotherProduct': 'Try another product name, material or color.',
  'search.close': 'Close search',
  'search.viewAllCount': {
    one: 'View {count} result',
    other: 'View all {count} results',
  },

  // Cart (shared layout)
  'cart.loading': 'Loading cart',

  // Shared (dialogs)
  'common.cancel': 'Cancel',

  // Home page
  'home.eyebrow': 'The new heirlooms',
  'home.titleStart': 'Wear your',
  'home.titleEmphasis': 'story.',
  'home.intro':
    'Find the pieces that feel like you. Discover new favorites, create your everyday layers and make every detail your own.',
  'home.exploreCollection': 'Explore the collection',
  'home.exploreTitle': 'Explore {title}',
  'home.exploreAll': 'Explore all pieces',
  'home.heroAlt': 'Explore the Jeweliette collection',
  'home.edit': 'The Jeweliette edit',
  'home.editFallback': 'Quietly unforgettable',
  'home.madeToLayer': 'Made to layer',
  'home.everydayFavorites': 'Your everyday favorites',
  'home.uniquelyYours': 'Uniquely yours',
  'home.selection': 'The Jeweliette selection',
  'home.coveted': 'Currently coveted',
  'home.viewAll': 'View all pieces',
  'home.emptyTitle': 'New favorites are on their way.',
  'home.emptyText': 'Explore the available collections below.',
  'home.storyAlt': 'Details from the Jeweliette collection',
  'home.makeItYours': 'Make it yours',
  'home.oneOfOne': 'One of one, just like you.',
  'home.storyText':
    'Start with a piece you love. Add the details that make it yours.',
  'home.discoverCollection': 'Discover the collection',
  'home.exploreCollections': 'Explore the collections',
  'home.detailsTitle': 'Considered details',
  'home.detailsText':
    'Explore the materials and finishes listed on each product page.',
  'home.layerText':
    'Find pieces to wear together, or a new favorite to wear on its own.',
  'home.selectionText':
    'Choose your options before adding a piece to your shopping bag.',

  // Catalog, filters and sorting
  'common.yourSelection': 'Your selection',
  'catalog.nextFavorite': 'Find your next favorite',
  'catalog.collectionsEyebrow': 'Jeweliette collections',
  'catalog.allEyebrow': 'The Jeweliette collection',
  'catalog.allIntro':
    'Find your next favorite. Explore pieces to wear, layer and make your own.',
  'catalog.piecesLoaded': {
    one: '{count} piece loaded',
    other: '{count} pieces loaded',
  },
  'catalog.noPieces': 'No pieces found.',
  'catalog.noPiecesHint': 'Try a different selection or clear your filters.',
  'catalog.sort.featured': 'Featured',
  'catalog.sort.bestselling': 'Best selling',
  'catalog.sort.newest': 'Newest',
  'catalog.sort.priceAsc': 'Price: low to high',
  'catalog.sort.priceDesc': 'Price: high to low',
  'filters.clear': 'Clear filters',
  'filters.sortBy': 'Sort by',
  'filters.inStock': 'In stock',
  // Labels for the Search & Discovery filters the app names itself (CatalogFilters)
  'filters.label.availability': 'Availability',
  'filters.label.price': 'Price',
  'filters.label.productType': 'Product type',
  'filters.label.brand': 'Brand',
  'filters.label.material': 'Material',
  'filters.label.metal': 'Metal',
  'filters.label.gemColor': 'Gem color',
  'price.noRange': 'No price range available.',
  'price.minLabel': 'Minimum price',
  'price.maxLabel': 'Maximum price',
  'price.min': 'Minimum',
  'price.max': 'Maximum',
  'price.invalid': 'Enter a valid minimum and maximum price.',
  'price.apply': 'Apply price',

  // Product cards and product page
  'product.view': 'View {title}',
  'product.addToBag': 'Add to bag',
  'product.adding': 'Adding…',
  'product.chooseOptions': 'Choose options',
  'product.soldOut': 'Sold out',
  'product.viewPiece': 'View piece',
  'product.from': 'From',
  'product.optionSoldOut': '{name} (sold out)',
  'product.noImage': 'No image available',
  'product.showImage': 'Show image {index} of {total}',
  'product.price': 'Price',
  'product.allergenBadge': 'Allergen',
  'product.favoriteRemove': 'Remove {title} from favorites',
  'product.favoriteAdd': 'Add {title} to favorites',
  'product.favoriteLogin': 'Log in to save {title} to favorites',
  'product.fittingRoomRemove': 'Remove {title} from fitting room',
  'product.fittingRoomAdd': 'Add {title} to fitting room',
  'product.fittingRoomLogin': 'Log in to add {title} to fitting room',
  'product.breadcrumb': 'Breadcrumb',
  'product.description': 'Description',
  'product.details': 'Details',
  'product.shipping': 'Shipping',
  'product.shippingText':
    'Shipping options and taxes are calculated at checkout.',
  'product.materials': 'Materials',
  'product.related': 'You may also like',
  'product.detail.type': 'Type',
  'product.detail.metal': 'Metal',
  'product.detail.gemstone': 'Gemstone',
  'product.detail.gemColor': 'Gem color',

  // Allergens and the allergy warning
  'allergen.nickel': 'Nickel',
  'allergen.zinc': 'Zinc',
  'allergen.cobalt': 'Cobalt',
  'allergy.title': 'Allergy warning',
  'allergy.confirm': 'Yes, add to bag',
  'allergy.message':
    'This piece contains {allergens}, which matches your allergy profile. Do you want to add it to your bag anyway?',

  // Ring sizes
  'ring.guide': 'Measurement Guide',
  'ring.yourSizes': 'Your ring sizes',
  'ring.noSizes': 'You have not saved your ring sizes yet.',
  'ring.addSizes': 'Add my ring sizes',
  'ring.hand.left': 'Left hand',
  'ring.hand.right': 'Right hand',
  'ring.finger.thumb': 'Thumb',
  'ring.finger.index': 'Index',
  'ring.finger.middle': 'Middle',
  'ring.finger.ring': 'Ring',
  'ring.finger.pinky': 'Pinky',
  'ring.fingerSize': '{finger}: {size}',

  // Recommendations
  'recommendation.eyebrowFavorites': 'Because you liked these',
  'recommendation.eyebrowPreferences': 'Based on your preferences',
  'recommendation.titlePreferences': 'Picked for you',
  'recommendation.reason.allergy': 'Allergy',
  'recommendation.reason.preferredMaterials':
    'Matches your preferred materials',
  'recommendation.reason.preferredColors': 'Matches your preferred colours',
  'recommendation.reason.preferredGemstones':
    'Matches your preferred gemstones',
  'recommendation.reason.skinTone': 'Matches your skin tone',
  'recommendation.reason.undertone': 'Matches your undertone',
  'recommendation.reason.sameMaterial': 'Same material: {value}',
  'recommendation.reason.sameMetal': 'Same metal: {value}',
  'recommendation.reason.similarCategory': 'Similar jewellery category',
  'recommendation.reason.sameCollection': 'From the same collection',
  'recommendation.reason.sameGemstone': 'Same gemstone: {value}',
  'recommendation.reason.sameGemColor': 'Same gem colour: {value}',
  'recommendation.reason.similarFavorite': 'Similar to your favorites',
  'recommendation.reason.popular': 'Popular piece',

  // Cart
  'common.remove': 'Remove',
  'common.logIn': 'Log in',
  'cart.region.page': 'Cart page',
  'cart.region.drawer': 'Cart drawer',
  'cart.lines': 'Line items',
  'cart.lineChildren': 'Line items with {title}',
  'cart.empty': 'Your bag is empty',
  'cart.emptyText':
    'Looks like you haven’t added anything yet. Explore the collections and find a piece you love.',
  'cart.continueShopping': 'Continue shopping',
  'cart.decrease': 'Decrease quantity',
  'cart.increase': 'Increase quantity',
  'cart.summary': 'Order summary',
  'cart.addCode': 'Add a code',
  'cart.subtotal': 'Subtotal',
  'cart.taxesNote': 'Shipping and taxes calculated at checkout.',
  'cart.checkout': 'Checkout',
  'cart.appliedCodes': 'Applied codes',
  'cart.removeDiscount': 'Remove discount code',
  'cart.giftCard': 'Gift card ***{last}',
  'cart.removeGiftCard': 'Remove gift card ending in {last}',
  'cart.discountCode': 'Discount code',
  'cart.giftCardCode': 'Gift card code',
  'cart.apply': 'Apply',

  // Favorites
  'favorites.loading': 'Loading favorites…',
  'favorites.loginTitle': 'Log in to save favorites.',
  'favorites.loginText':
    'Sign in to keep your favourite pieces across devices.',
  'favorites.emptyTitle': 'Nothing saved yet.',
  'favorites.emptyText': 'Tap the heart on any piece to keep it here.',

  // Fitting room
  'fittingRoom.loading': 'Loading your fitting room…',
  'fittingRoom.loginTitle': 'Log in to use the fitting room.',
  'fittingRoom.loginText':
    'Sign in to keep the pieces you want to try across devices.',
  'fittingRoom.emptyTitle': 'Your fitting room is empty.',
  'fittingRoom.emptyText': 'Use the hanger button on any piece to add it here.',
  'fittingRoom.loadingPieces': 'Loading pieces…',
  'fittingRoom.unavailableTitle': 'These pieces are unavailable.',
  'fittingRoom.unavailableText': 'They may have been removed from the store.',
  'fittingRoom.listLabel': 'Pieces in your fitting room',
  'fittingRoom.count': {one: '{count} piece', other: '{count} pieces'},
  'fittingRoom.selectAll': 'Select all',
  'fittingRoom.clear': 'Clear',
  'fittingRoom.select': 'Select {title}',
  'fittingRoom.moveLabel': 'Move {title} to cart',
  'fittingRoom.moving': 'Moving…',
  'fittingRoom.moveToCart': 'Move to cart',
  'fittingRoom.tryOn': 'Virtual try-on',
  'fittingRoom.tryOnTitle': 'See it on you',
  'fittingRoom.tryOnText':
    'Choose the pieces you want to try together. The virtual fitting experience is coming soon.',
  'fittingRoom.readyToTry': {
    one: '{count} piece ready to try',
    other: '{count} pieces ready to try',
  },
  'fittingRoom.selectHint':
    'Select at least one piece on the left to build your look.',
  'fittingRoom.error.unauthorized': 'Unauthorized',
  'fittingRoom.error.invalid': 'Invalid product',
  'fittingRoom.error.soldOut': 'This piece is sold out',
  'fittingRoom.error.remove': 'Could not remove from fitting room',
  'fittingRoom.error.move': 'Could not move to cart',

  // Account
  'common.clear': 'Clear',
  'common.notSet': 'Not set',
  'common.saving': 'Saving…',
  'account.welcomeName': 'Welcome, {name}',
  'account.welcome': 'Welcome to your account.',
  'account.details': 'Account Details',
  'account.orders': 'Orders',
  'account.profile': 'Profile',
  'account.addresses': 'Addresses',
  'account.signOut': 'Sign out',
  'account.error.unauthorized': 'Unauthorized',
  'account.error.method': 'Method not allowed',

  // Orders
  'orders.title': 'Your orders',
  'orders.search': 'Search orders',
  'orders.filter': 'Filter Orders',
  'orders.numberPlaceholder': 'Order #',
  'orders.numberLabel': 'Order number',
  'orders.confirmationPlaceholder': 'Confirmation #',
  'orders.confirmationLabel': 'Confirmation number',
  'orders.searching': 'Searching',
  'orders.emptyFilteredTitle': 'No matching orders',
  'orders.emptyTitle': 'Your story starts here',
  'orders.emptyFilteredText': 'Try another order number or clear your filters.',
  'orders.emptyText': "You haven't placed any orders yet.",
  'orders.startShopping': 'Start shopping',
  'orders.orderNumber': 'Order #{number}',
  'orders.view': 'View order',
  'order.title': 'Order {name}',
  'order.placedOn': 'Placed on {date}',
  'order.confirmation': 'Confirmation: {number}',
  'order.product': 'Product',
  'order.quantity': 'Quantity',
  'order.total': 'Total',
  'order.discounts': 'Discounts',
  'order.percentOff': '-{percent}% OFF',
  'order.tax': 'Tax',
  'order.shippingAddress': 'Shipping Address',
  'order.noShippingAddress': 'No shipping address defined',
  'order.status': 'Status',
  'order.statusNone': 'Not available',
  'order.viewStatus': 'View order status',
  'order.financial.AUTHORIZED': 'Authorized',
  'order.financial.EXPIRED': 'Expired',
  'order.financial.PAID': 'Paid',
  'order.financial.PARTIALLY_PAID': 'Partially paid',
  'order.financial.PARTIALLY_REFUNDED': 'Partially refunded',
  'order.financial.PENDING': 'Pending',
  'order.financial.REFUNDED': 'Refunded',
  'order.financial.VOIDED': 'Voided',
  'order.fulfillment.CANCELLED': 'Cancelled',
  'order.fulfillment.ERROR': 'Error',
  'order.fulfillment.FAILURE': 'Failed',
  'order.fulfillment.OPEN': 'Open',
  'order.fulfillment.PENDING': 'Pending',
  'order.fulfillment.SUCCESS': 'Fulfilled',

  // Addresses and profile
  'address.create': 'Create address',
  'address.none': 'You have no addresses saved.',
  'address.existing': 'Existing addresses',
  'address.firstName': 'First name',
  'address.lastName': 'Last name',
  'address.company': 'Company',
  'address.address1': 'Address line 1',
  'address.address2': 'Address line 2',
  'address.city': 'City',
  'address.zone': 'State / Province',
  'address.zip': 'Zip / Postal Code',
  'address.countryCode': 'Country code',
  'address.country': 'Country',
  'address.phone': 'Phone',
  'address.phoneNumber': 'Phone number',
  'address.default': 'Set as default address',
  'address.creating': 'Creating',
  'address.createButton': 'Create',
  'address.saving': 'Saving',
  'address.save': 'Save',
  'address.deleting': 'Deleting',
  'address.delete': 'Delete',
  'address.error.missingId': 'You must provide an address id.',
  'address.error.create': 'Customer address create failed.',
  'address.error.update': 'Customer address update failed.',
  'address.error.delete': 'Customer address delete failed.',
  'profile.personalInfo': 'Personal information',
  'profile.updated': 'Profile updated.',
  'profile.updating': 'Updating',
  'profile.update': 'Update',
  'profile.error.update': 'Customer profile update failed.',

  // Preferences and ring sizes
  'preferences.title': 'Preferences',
  'preferences.intro':
    'Tell us what suits your skin so suggestions can fit you better.',
  'preferences.loadError':
    'Could not load preferences. Refresh the page to try again.',
  'preferences.loading': 'Loading preferences…',
  'preferences.allergies': 'Allergies',
  'preferences.skinTone': 'Skin tone',
  'preferences.undertone': 'Undertone',
  'preferences.tone.fair': 'Fair',
  'preferences.tone.light': 'Light',
  'preferences.tone.medium': 'Medium',
  'preferences.tone.tan': 'Tan',
  'preferences.tone.deep': 'Deep',
  'preferences.undertone.cool': 'Cool',
  'preferences.undertone.warm': 'Warm',
  'preferences.undertone.neutral': 'Neutral',
  'preferences.save': 'Save preferences',
  'preferences.saved': 'Preferences saved.',
  'preferences.saveError': 'Could not save preferences.',
  'ring.title': 'Ring sizes',
  'ring.intro':
    'Save your US ring size for each finger. Ring products will show your saved sizes.',
  'ring.howToMeasure': 'How to measure your finger',
  'ring.loadError': 'Could not load ring sizes. Refresh the page to try again.',
  'ring.loading': 'Loading ring sizes…',
  'ring.save': 'Save ring sizes',
  'ring.saved': 'Ring sizes saved.',
  'ring.saveError': 'Could not save ring sizes.',

  // Page titles and descriptions
  'meta.homeTitle': 'Jeweliette | Wear your story',
  'meta.homeDescription':
    'Explore the Jeweliette collection. Find pieces to wear, layer and make your own.',
  'meta.collectionFallback': 'Collection',
  'meta.collectionDescription': 'Explore the Jeweliette collection.',
  'meta.productFallback': 'Product',
  'meta.pageFallback': 'Page',
  'meta.policyFallback': 'Policy',
  'meta.blogs': 'Blogs',

  // Errors and content pages
  'error.label': 'Error {status}',
  'error.notFoundTitle': 'Page not found.',
  'error.notFoundText':
    'The page you are looking for does not exist or has moved.',
  'error.title': 'Something went wrong.',
  'error.badRequestText':
    'The request could not be processed. Check the link and try again.',
  'error.unexpectedText': 'An unexpected error occurred. Please try again.',
  'error.backHome': 'Back to home',
  'policies.eyebrow': 'Information',
  'policies.title': 'Store policies',
  'policies.all': 'All policies',

  // Product options
  'product.optionValue': '{option}: {value}',
} as const satisfies Record<string, string | PluralMessage>;

export type MessageKey = keyof typeof en;

/** The shape every language must provide. */
export type Messages = {
  [Key in MessageKey]: (typeof en)[Key] extends string ? string : PluralMessage;
};
