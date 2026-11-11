import type {Messages} from './en';

/** French (fr-FR) UI messages. Terminology: docs/i18n.md → Glossary. */
export const fr: Messages = {
  'language.label': 'Langue',
  // French typography: no-break space before the colon.
  'language.current': 'Langue actuelle : {language}',
  'nav.skipToContent': 'Aller au contenu',
  'nav.main': 'Navigation principale',
  'nav.mobile': 'Menu de navigation',
  'nav.accountActions': 'Actions du compte',
  'nav.home': 'Accueil',
  'nav.homeOf': '{shop} — accueil',
  'nav.openMenu': 'Ouvrir le menu',
  'nav.menu': 'Menu',
  'nav.search': 'Rechercher',
  'nav.account': 'Compte',
  'nav.myAccount': 'Mon compte',
  'nav.favorites': 'Favoris',
  'nav.fittingRoom': 'Cabine d’essayage',
  'nav.shoppingBag': 'Panier',
  // CLDR French: `one` covers 0 and 1, `many` large round numbers (1 000 000).
  'nav.openCart': {
    one: 'Ouvrir le panier ({count} article)',
    many: 'Ouvrir le panier ({count} d’articles)',
    other: 'Ouvrir le panier ({count} articles)',
  },
  'nav.close': 'Fermer',
  'nav.closePanel': 'Fermer le panneau',

  // Shared
  'common.allPieces': 'Toutes les pièces',
  'common.collections': 'Collections',
  'common.loading': 'Chargement…',
  'common.loadPrevious': 'Charger les précédents',
  'common.loadMore': 'Charger plus',
  'common.closeDialog': 'Fermer la fenêtre',

  // Layout: announcement bar and fallback header menu
  'layout.announcement': 'Livraison offerte dès 100 € d’achat',
  'layout.tagline': 'Conçu pour durer',
  'menu.trending': 'Tendances',
  'menu.watches': 'Montres',
  'menu.charms': 'Charms',
  'menu.jewelry': 'Bijoux',

  // Footer
  'footer.tagline': 'Des bijoux modernes à superposer, à offrir et à garder.',
  'footer.discover': 'Découvrir',
  'footer.information': 'Informations',
  'footer.newsletterTitle': 'Nos histoires dans votre boîte mail',
  'footer.newsletterText':
    'Nouveautés, conseils de style et accès en avant-première.',
  'footer.email': 'Adresse e-mail',
  'footer.newsletterSoon': 'Newsletter bientôt disponible',
  'footer.subscribe': 'S’abonner à la newsletter',
  'footer.signature': 'Pensé pour être gardé',
  'policy.privacy': 'Politique de confidentialité',
  'policy.refund': 'Politique de remboursement',
  'policy.shipping': 'Politique d’expédition',
  'policy.terms': 'Conditions d’utilisation',

  // Search
  'search.title': 'Rechercher sur Jeweliette',
  'search.placeholder': 'Que recherchez-vous ?',
  'search.inputLabel': 'Rechercher des produits',
  'search.seeAll': 'Voir tous les résultats',
  'search.searching': 'Recherche en cours…',
  'search.explore': 'Explorer',
  'search.noResults': 'Aucun résultat',
  'search.tryAnotherTerm': 'Essayez un autre terme que « {term} ».',
  'search.noResultsFor': 'Aucun résultat pour « {term} »',
  'search.unavailable':
    'La recherche est temporairement indisponible. Veuillez réessayer.',
  'search.prompt': 'Recherchez une pièce, une matière ou une collection.',
  'search.noFilteredProducts':
    'Aucun produit ne correspond à votre recherche et aux filtres sélectionnés.',
  'search.articles': 'Articles',
  'search.pages': 'Pages',
  'search.pieces': 'Pièces',
  'search.tryAnotherProduct':
    'Essayez un autre nom de produit, une autre matière ou une autre couleur.',

  // Cart (shared layout)
  'cart.loading': 'Chargement du panier',

  // Shared (dialogs)
  'common.cancel': 'Annuler',

  // Home page
  'home.eyebrow': 'Les nouveaux bijoux de famille',
  'home.titleStart': 'Portez votre',
  'home.titleEmphasis': 'histoire.',
  'home.intro':
    'Trouvez les pièces qui vous ressemblent. Découvrez de nouveaux favoris, composez vos superpositions du quotidien et faites de chaque détail le vôtre.',
  'home.exploreCollection': 'Découvrir la collection',
  'home.exploreTitle': 'Découvrir {title}',
  'home.exploreAll': 'Découvrir toutes les pièces',
  'home.heroAlt': 'Découvrir la collection Jeweliette',
  'home.edit': 'L’essentiel Jeweliette',
  'home.editFallback': 'Discrètement inoubliable',
  'home.madeToLayer': 'Conçu pour être superposé',
  'home.everydayFavorites': 'Vos favoris du quotidien',
  'home.uniquelyYours': 'Unique, comme vous',
  'home.selection': 'La sélection Jeweliette',
  'home.coveted': 'Les plus convoités',
  'home.viewAll': 'Voir toutes les pièces',
  'home.emptyTitle': 'De nouveaux favoris arrivent bientôt.',
  'home.emptyText': 'Découvrez les collections disponibles ci-dessous.',
  'home.storyAlt': 'Détails de la collection Jeweliette',
  'home.makeItYours': 'Faites-la vôtre',
  'home.oneOfOne': 'Unique, tout comme vous.',
  'home.storyText':
    'Commencez par une pièce que vous aimez. Ajoutez les détails qui la rendent unique.',
  'home.discoverCollection': 'Découvrir la collection',
  'home.exploreCollections': 'Découvrir les collections',
  'home.detailsTitle': 'Des détails soignés',
  'home.detailsText':
    'Découvrez les matières et finitions indiquées sur chaque fiche produit.',
  'home.layerText':
    'Trouvez des pièces à porter ensemble, ou un nouveau favori à porter seul.',
  'home.selectionText':
    'Choisissez vos options avant d’ajouter une pièce à votre panier.',

  // Catalog, filters and sorting
  'common.yourSelection': 'Votre sélection',
  'catalog.nextFavorite': 'Trouvez votre prochain coup de cœur',
  'catalog.collectionsEyebrow': 'Collections Jeweliette',
  'catalog.allEyebrow': 'La collection Jeweliette',
  'catalog.allIntro':
    'Trouvez votre prochain coup de cœur. Découvrez des pièces à porter, à superposer et à faire vôtres.',
  'catalog.piecesLoaded': {
    one: '{count} pièce chargée',
    other: '{count} pièces chargées',
  },
  'catalog.noPieces': 'Aucune pièce trouvée.',
  'catalog.noPiecesHint': 'Essayez une autre sélection ou effacez vos filtres.',
  'catalog.sort.featured': 'En vedette',
  'catalog.sort.bestselling': 'Meilleures ventes',
  'catalog.sort.newest': 'Nouveautés',
  'catalog.sort.priceAsc': 'Prix croissant',
  'catalog.sort.priceDesc': 'Prix décroissant',
  'filters.clear': 'Effacer les filtres',
  'filters.sortBy': 'Trier par',
  'filters.inStock': 'En stock',
  'price.noRange': 'Aucune fourchette de prix disponible.',
  'price.minLabel': 'Prix minimum',
  'price.maxLabel': 'Prix maximum',
  'price.min': 'Minimum',
  'price.max': 'Maximum',
  'price.invalid': 'Saisissez un prix minimum et un prix maximum valides.',
  'price.apply': 'Appliquer le prix',

  // Product cards and product page
  'product.view': 'Voir {title}',
  'product.addToBag': 'Ajouter au panier',
  'product.adding': 'Ajout en cours…',
  'product.chooseOptions': 'Choisir les options',
  'product.soldOut': 'Épuisé',
  'product.viewPiece': 'Voir la pièce',
  'product.from': 'À partir de',
  'product.optionSoldOut': '{name} (épuisé)',
  'product.noImage': 'Aucune image disponible',
  'product.showImage': 'Afficher l’image {index} sur {total}',
  'product.price': 'Prix',
  'product.allergenBadge': 'Allergène',
  'product.favoriteRemove': 'Retirer {title} des favoris',
  'product.favoriteAdd': 'Ajouter {title} aux favoris',
  'product.favoriteLogin': 'Connectez-vous pour ajouter {title} à vos favoris',
  'product.fittingRoomRemove': 'Retirer {title} de la cabine d’essayage',
  'product.fittingRoomAdd': 'Ajouter {title} à la cabine d’essayage',
  'product.fittingRoomLogin':
    'Connectez-vous pour ajouter {title} à la cabine d’essayage',
  'product.breadcrumb': 'Fil d’Ariane',
  'product.description': 'Description',
  'product.details': 'Détails',
  'product.shipping': 'Livraison',
  'product.shippingText':
    'Les options de livraison et les taxes sont calculées lors du paiement.',
  'product.materials': 'Matières',
  'product.related': 'Vous aimerez aussi',
  'product.detail.type': 'Type',
  'product.detail.metal': 'Métal',
  'product.detail.gemstone': 'Pierre',
  'product.detail.gemColor': 'Couleur de la pierre',

  // Allergens and the allergy warning
  'allergen.nickel': 'Nickel',
  'allergen.zinc': 'Zinc',
  'allergen.cobalt': 'Cobalt',
  'allergy.title': 'Alerte allergie',
  'allergy.confirm': 'Oui, ajouter au panier',
  'allergy.message':
    'Cette pièce contient les allergènes suivants : {allergens}. Ils figurent dans votre profil d’allergies. Voulez-vous quand même l’ajouter à votre panier ?',

  // Ring sizes
  'ring.guide': 'Guide des tailles',
  'ring.yourSizes': 'Vos tailles de bague',
  'ring.noSizes': 'Vous n’avez pas encore enregistré vos tailles de bague.',
  'ring.addSizes': 'Ajouter mes tailles',
  'ring.hand.left': 'Main gauche',
  'ring.hand.right': 'Main droite',
  'ring.finger.thumb': 'Pouce',
  'ring.finger.index': 'Index',
  'ring.finger.middle': 'Majeur',
  'ring.finger.ring': 'Annulaire',
  'ring.finger.pinky': 'Auriculaire',
  'ring.fingerSize': '{finger} : {size}',

  // Recommendations
  'recommendation.eyebrowFavorites': 'Parce que vous avez aimé ces pièces',
  'recommendation.eyebrowPreferences': 'Selon vos préférences',
  'recommendation.titlePreferences': 'Sélectionnées pour vous',
  'recommendation.reason.allergy': 'Allergie',
  'recommendation.reason.preferredMaterials':
    'Correspond à vos matières préférées',
  'recommendation.reason.preferredColors':
    'Correspond à vos couleurs préférées',
  'recommendation.reason.preferredGemstones':
    'Correspond à vos pierres préférées',
  'recommendation.reason.skinTone': 'Assorti à votre carnation',
  'recommendation.reason.undertone': 'Assorti à votre sous-ton',
  'recommendation.reason.sameMaterial': 'Même matière : {value}',
  'recommendation.reason.sameMetal': 'Même métal : {value}',
  'recommendation.reason.similarCategory': 'Catégorie de bijou similaire',
  'recommendation.reason.sameCollection': 'De la même collection',
  'recommendation.reason.sameGemstone': 'Même pierre : {value}',
  'recommendation.reason.sameGemColor': 'Même couleur de pierre : {value}',
  'recommendation.reason.similarFavorite': 'Semblable à vos favoris',
  'recommendation.reason.popular': 'Pièce populaire',

  // Cart
  'common.remove': 'Retirer',
  'common.logIn': 'Se connecter',
  'cart.region.page': 'Page du panier',
  'cart.region.drawer': 'Volet du panier',
  'cart.lines': 'Articles',
  'cart.lineChildren': 'Articles avec {title}',
  'cart.empty': 'Votre panier est vide',
  'cart.emptyText':
    'Vous n’avez encore rien ajouté. Découvrez les collections et trouvez une pièce qui vous plaît.',
  'cart.continueShopping': 'Continuer mes achats',
  'cart.decrease': 'Diminuer la quantité',
  'cart.increase': 'Augmenter la quantité',
  'cart.summary': 'Récapitulatif de la commande',
  'cart.addCode': 'Ajouter un code',
  'cart.subtotal': 'Sous-total',
  'cart.taxesNote': 'Livraison et taxes calculées lors du paiement.',
  'cart.checkout': 'Paiement',
  'cart.appliedCodes': 'Codes appliqués',
  'cart.removeDiscount': 'Retirer le code de réduction',
  'cart.giftCard': 'Carte cadeau ***{last}',
  'cart.removeGiftCard': 'Retirer la carte cadeau se terminant par {last}',
  'cart.discountCode': 'Code de réduction',
  'cart.giftCardCode': 'Code de la carte cadeau',
  'cart.apply': 'Appliquer',

  // Favorites
  'favorites.loading': 'Chargement des favoris…',
  'favorites.loginTitle': 'Connectez-vous pour enregistrer vos favoris.',
  'favorites.loginText':
    'Connectez-vous pour retrouver vos pièces favorites sur tous vos appareils.',
  'favorites.emptyTitle': 'Aucun favori pour le moment.',
  'favorites.emptyText': 'Touchez le cœur d’une pièce pour la retrouver ici.',

  // Fitting room
  'fittingRoom.loading': 'Chargement de votre cabine d’essayage…',
  'fittingRoom.loginTitle':
    'Connectez-vous pour utiliser la cabine d’essayage.',
  'fittingRoom.loginText':
    'Connectez-vous pour retrouver les pièces à essayer sur tous vos appareils.',
  'fittingRoom.emptyTitle': 'Votre cabine d’essayage est vide.',
  'fittingRoom.emptyText':
    'Utilisez le bouton cintre d’une pièce pour l’ajouter ici.',
  'fittingRoom.loadingPieces': 'Chargement des pièces…',
  'fittingRoom.unavailableTitle': 'Ces pièces ne sont pas disponibles.',
  'fittingRoom.unavailableText':
    'Elles ont peut-être été retirées de la boutique.',
  'fittingRoom.listLabel': 'Pièces dans votre cabine d’essayage',
  'fittingRoom.count': {one: '{count} pièce', other: '{count} pièces'},
  'fittingRoom.selectAll': 'Tout sélectionner',
  'fittingRoom.clear': 'Effacer',
  'fittingRoom.select': 'Sélectionner {title}',
  'fittingRoom.moveLabel': 'Déplacer {title} vers le panier',
  'fittingRoom.moving': 'Déplacement…',
  'fittingRoom.moveToCart': 'Mettre au panier',
  'fittingRoom.tryOn': 'Essayage virtuel',
  'fittingRoom.tryOnTitle': 'Voyez le rendu sur vous',
  'fittingRoom.tryOnText':
    'Choisissez les pièces à essayer ensemble. L’essayage virtuel arrive bientôt.',
  'fittingRoom.readyToTry': {
    one: '{count} pièce prête à essayer',
    other: '{count} pièces prêtes à essayer',
  },
  'fittingRoom.selectHint':
    'Sélectionnez au moins une pièce à gauche pour composer votre look.',
  'fittingRoom.error.unauthorized': 'Non autorisé',
  'fittingRoom.error.invalid': 'Produit invalide',
  'fittingRoom.error.soldOut': 'Cette pièce est épuisée',
  'fittingRoom.error.remove':
    'Impossible de retirer la pièce de la cabine d’essayage',
  'fittingRoom.error.move': 'Impossible de déplacer la pièce vers le panier',
};
