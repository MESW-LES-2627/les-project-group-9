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
};
