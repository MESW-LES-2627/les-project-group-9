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
};
