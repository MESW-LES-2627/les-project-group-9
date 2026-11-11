import type {Messages} from './en';

/** European Portuguese (pt-PT) UI messages. Terminology: docs/i18n.md → Glossary. */
export const pt: Messages = {
  'language.label': 'Idioma',
  'language.current': 'Idioma atual: {language}',
  'nav.skipToContent': 'Saltar para o conteúdo',
  'nav.main': 'Navegação principal',
  'nav.mobile': 'Menu de navegação',
  'nav.accountActions': 'Ações da conta',
  'nav.home': 'Início',
  'nav.homeOf': '{shop} — página inicial',
  'nav.openMenu': 'Abrir menu',
  'nav.menu': 'Menu',
  'nav.search': 'Pesquisar',
  'nav.account': 'Conta',
  'nav.myAccount': 'A minha conta',
  'nav.favorites': 'Favoritos',
  'nav.fittingRoom': 'Provador',
  'nav.shoppingBag': 'Saco de compras',
  'nav.openCart': {
    one: 'Abrir saco de compras com {count} artigo',
    other: 'Abrir saco de compras com {count} artigos',
  },
  'nav.close': 'Fechar',
  'nav.closePanel': 'Fechar painel',

  // Shared
  'common.allPieces': 'Todas as peças',
  'common.collections': 'Coleções',
  'common.loading': 'A carregar…',
  'common.loadPrevious': 'Carregar anteriores',
  'common.loadMore': 'Carregar mais',
  'common.closeDialog': 'Fechar janela',

  // Layout: announcement bar and fallback header menu
  'layout.announcement': 'Envio gratuito em encomendas acima de 100 €',
  'layout.tagline': 'Feito para durar',
  'menu.trending': 'Tendências',
  'menu.watches': 'Relógios',
  'menu.charms': 'Charms',
  'menu.jewelry': 'Joias',

  // Footer
  'footer.tagline': 'Joias modernas para combinar, oferecer e guardar.',
  'footer.discover': 'Descobrir',
  'footer.information': 'Informação',
  'footer.newsletterTitle': 'Histórias na sua caixa de correio',
  'footer.newsletterText': 'Novidades, guias de estilo e acesso antecipado.',
  'footer.email': 'Endereço de e-mail',
  'footer.newsletterSoon': 'Newsletter em breve',
  'footer.subscribe': 'Subscrever a newsletter',
  'footer.signature': 'Pensado para ser guardado',
  'policy.privacy': 'Política de privacidade',
  'policy.refund': 'Política de reembolso',
  'policy.shipping': 'Política de envio',
  'policy.terms': 'Termos de serviço',

  // Search
  'search.title': 'Pesquisar na Jeweliette',
  'search.placeholder': 'O que procura?',
  'search.inputLabel': 'Pesquisar produtos',
  'search.seeAll': 'Ver todos os resultados',
  'search.searching': 'A pesquisar…',
  'search.explore': 'Explorar',
  'search.noResults': 'Sem resultados',
  'search.tryAnotherTerm': 'Experimente outro termo em vez de «{term}».',
  'search.noResultsFor': 'Nenhum resultado para «{term}»',
  'search.unavailable':
    'A pesquisa está temporariamente indisponível. Tente novamente.',
  'search.prompt': 'Pesquise uma peça, um material ou uma coleção.',
  'search.noFilteredProducts':
    'Nenhum produto corresponde à sua pesquisa e aos filtros selecionados.',
  'search.articles': 'Artigos',
  'search.pages': 'Páginas',
  'search.pieces': 'Peças',
  'search.tryAnotherProduct':
    'Experimente outro nome de produto, material ou cor.',

  // Cart (shared layout)
  'cart.loading': 'A carregar o saco de compras',

  // Shared (dialogs)
  'common.cancel': 'Cancelar',

  // Home page
  'home.eyebrow': 'As novas joias de família',
  'home.titleStart': 'Use a sua',
  'home.titleEmphasis': 'história.',
  'home.intro':
    'Encontre as peças que combinam consigo. Descubra novos favoritos, crie as suas combinações do dia a dia e torne cada detalhe seu.',
  'home.exploreCollection': 'Explorar a coleção',
  'home.exploreTitle': 'Explorar {title}',
  'home.exploreAll': 'Explorar todas as peças',
  'home.heroAlt': 'Explorar a coleção Jeweliette',
  'home.edit': 'O essencial Jeweliette',
  'home.editFallback': 'Discretamente inesquecível',
  'home.madeToLayer': 'Feito para combinar',
  'home.everydayFavorites': 'Os seus favoritos de todos os dias',
  'home.uniquelyYours': 'Unicamente seu',
  'home.selection': 'A seleção Jeweliette',
  'home.coveted': 'Os mais desejados',
  'home.viewAll': 'Ver todas as peças',
  'home.emptyTitle': 'Novos favoritos estão a caminho.',
  'home.emptyText': 'Explore as coleções disponíveis abaixo.',
  'home.storyAlt': 'Detalhes da coleção Jeweliette',
  'home.makeItYours': 'Torne-a sua',
  'home.oneOfOne': 'Única, tal como você.',
  'home.storyText':
    'Comece com uma peça de que gosta. Acrescente os detalhes que a tornam sua.',
  'home.discoverCollection': 'Descobrir a coleção',
  'home.exploreCollections': 'Explorar as coleções',
  'home.detailsTitle': 'Detalhes pensados',
  'home.detailsText':
    'Conheça os materiais e acabamentos indicados na página de cada produto.',
  'home.layerText':
    'Encontre peças para usar em conjunto ou um novo favorito para usar sozinho.',
  'home.selectionText':
    'Escolha as opções antes de adicionar uma peça ao saco de compras.',

  // Catalog, filters and sorting
  'common.yourSelection': 'A sua seleção',
  'catalog.nextFavorite': 'Encontre o seu próximo favorito',
  'catalog.collectionsEyebrow': 'Coleções Jeweliette',
  'catalog.allEyebrow': 'A coleção Jeweliette',
  'catalog.allIntro':
    'Encontre o seu próximo favorito. Explore peças para usar, combinar e tornar suas.',
  'catalog.piecesLoaded': {
    one: '{count} peça carregada',
    other: '{count} peças carregadas',
  },
  'catalog.noPieces': 'Não foram encontradas peças.',
  'catalog.noPiecesHint': 'Experimente outra seleção ou limpe os filtros.',
  'catalog.sort.featured': 'Em destaque',
  'catalog.sort.bestselling': 'Mais vendidos',
  'catalog.sort.newest': 'Novidades',
  'catalog.sort.priceAsc': 'Preço: do mais baixo ao mais alto',
  'catalog.sort.priceDesc': 'Preço: do mais alto ao mais baixo',
  'filters.clear': 'Limpar filtros',
  'filters.sortBy': 'Ordenar por',
  'filters.inStock': 'Em stock',
  'price.noRange': 'Não há um intervalo de preços disponível.',
  'price.minLabel': 'Preço mínimo',
  'price.maxLabel': 'Preço máximo',
  'price.min': 'Mínimo',
  'price.max': 'Máximo',
  'price.invalid': 'Introduza um preço mínimo e um preço máximo válidos.',
  'price.apply': 'Aplicar preço',

  // Product cards and product page
  'product.view': 'Ver {title}',
  'product.addToBag': 'Adicionar ao saco',
  'product.adding': 'A adicionar…',
  'product.chooseOptions': 'Escolher opções',
  'product.soldOut': 'Esgotado',
  'product.viewPiece': 'Ver peça',
  'product.from': 'Desde',
  'product.optionSoldOut': '{name} (esgotado)',
  'product.noImage': 'Imagem indisponível',
  'product.showImage': 'Mostrar imagem {index} de {total}',
  'product.price': 'Preço',
  'product.allergenBadge': 'Alergénio',
  'product.favoriteRemove': 'Remover {title} dos favoritos',
  'product.favoriteAdd': 'Adicionar {title} aos favoritos',
  'product.favoriteLogin': 'Inicie sessão para guardar {title} nos favoritos',
  'product.fittingRoomRemove': 'Remover {title} do provador',
  'product.fittingRoomAdd': 'Adicionar {title} ao provador',
  'product.fittingRoomLogin':
    'Inicie sessão para adicionar {title} ao provador',
  'product.breadcrumb': 'Caminho de navegação',
  'product.description': 'Descrição',
  'product.details': 'Detalhes',
  'product.shipping': 'Envio',
  'product.shippingText':
    'As opções de envio e os impostos são calculados na finalização da compra.',
  'product.materials': 'Materiais',
  'product.related': 'Também pode gostar',
  'product.detail.type': 'Tipo',
  'product.detail.metal': 'Metal',
  'product.detail.gemstone': 'Pedra preciosa',
  'product.detail.gemColor': 'Cor da pedra',

  // Allergens and the allergy warning
  'allergen.nickel': 'Níquel',
  'allergen.zinc': 'Zinco',
  'allergen.cobalt': 'Cobalto',
  'allergy.title': 'Aviso de alergia',
  'allergy.confirm': 'Sim, adicionar ao saco',
  'allergy.message':
    'Esta peça contém {allergens}, o que corresponde ao seu perfil de alergias. Pretende adicioná-la ao saco mesmo assim?',

  // Ring sizes
  'ring.guide': 'Guia de medidas',
  'ring.yourSizes': 'Os seus tamanhos de anel',
  'ring.noSizes': 'Ainda não guardou os seus tamanhos de anel.',
  'ring.addSizes': 'Adicionar os meus tamanhos',
  'ring.hand.left': 'Mão esquerda',
  'ring.hand.right': 'Mão direita',
  'ring.finger.thumb': 'Polegar',
  'ring.finger.index': 'Indicador',
  'ring.finger.middle': 'Médio',
  'ring.finger.ring': 'Anelar',
  'ring.finger.pinky': 'Mindinho',
  'ring.fingerSize': '{finger}: {size}',

  // Recommendations
  'recommendation.eyebrowFavorites': 'Porque gostou destas peças',
  'recommendation.eyebrowPreferences': 'Com base nas suas preferências',
  'recommendation.titlePreferences': 'Escolhidas para si',
  'recommendation.reason.allergy': 'Alergia',
  'recommendation.reason.preferredMaterials':
    'Corresponde aos seus materiais preferidos',
  'recommendation.reason.preferredColors':
    'Corresponde às suas cores preferidas',
  'recommendation.reason.preferredGemstones':
    'Corresponde às suas pedras preferidas',
  'recommendation.reason.skinTone': 'Combina com o seu tom de pele',
  'recommendation.reason.undertone': 'Combina com o seu subtom',
  'recommendation.reason.sameMaterial': 'Mesmo material: {value}',
  'recommendation.reason.sameMetal': 'Mesmo metal: {value}',
  'recommendation.reason.similarCategory': 'Categoria de joia semelhante',
  'recommendation.reason.sameCollection': 'Da mesma coleção',
  'recommendation.reason.sameGemstone': 'Mesma pedra: {value}',
  'recommendation.reason.sameGemColor': 'Mesma cor de pedra: {value}',
  'recommendation.reason.similarFavorite': 'Semelhante aos seus favoritos',
  'recommendation.reason.popular': 'Peça popular',
};
