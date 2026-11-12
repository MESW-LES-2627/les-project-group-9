import {describe, expect, it} from 'vitest';
import {meta as addressesMeta} from '../../app/routes/account.addresses';
import {meta as ordersMeta} from '../../app/routes/account.orders._index';
import {meta as profileMeta} from '../../app/routes/account.profile';
import {meta as blogsMeta} from '../../app/routes/blogs._index';
import {meta as cartMeta} from '../../app/routes/cart';
import {meta as allPiecesMeta} from '../../app/routes/collections.all';
import {meta as favoritesMeta} from '../../app/routes/favorites';
import {meta as fittingRoomMeta} from '../../app/routes/fitting-room';
import {meta as productMeta} from '../../app/routes/products.$handle';
import {meta as searchMeta} from '../../app/routes/search';
import {toAppLocale, type LocaleCode} from '../../app/lib/i18n';

const LANGUAGE = {en: 'EN', pt: 'PT_PT', fr: 'FR'} as const;

type MetaArgs = {
  matches: Array<{id: string; loaderData?: unknown}>;
  data?: unknown;
};
type MetaFunction = (args: never) => unknown;

/** Calls a route `meta` as React Router does, with the locale in the root match. */
function titleOf(meta: MetaFunction, code: LocaleCode, data?: unknown) {
  const args: MetaArgs = {
    matches: [
      {
        id: 'root',
        loaderData: {
          locale: toAppLocale({language: LANGUAGE[code], country: 'US'}),
        },
      },
    ],
    data,
  };
  const tags = meta(args as never) as Array<{title?: string}>;
  return tags.find((tag) => tag.title)?.title;
}

/* Expected titles are written out, not computed with the translator. */
const PAGES: Array<[string, MetaFunction, Record<LocaleCode, string>]> = [
  ['account.addresses', addressesMeta, {en: 'Addresses', pt: 'Moradas', fr: 'Adresses'}],
  ['account.orders._index', ordersMeta, {en: 'Orders', pt: 'Encomendas', fr: 'Commandes'}],
  ['account.profile', profileMeta, {en: 'Profile', pt: 'Perfil', fr: 'Profil'}],
  ['blogs._index', blogsMeta, {en: 'Blogs', pt: 'Blogues', fr: 'Blogs'}],
  ['cart', cartMeta, {en: 'Shopping bag', pt: 'Saco de compras', fr: 'Panier'}],
  [
    'collections.all',
    allPiecesMeta,
    {en: 'All pieces', pt: 'Todas as peças', fr: 'Toutes les pièces'},
  ],
  ['favorites', favoritesMeta, {en: 'Favorites', pt: 'Favoritos', fr: 'Favoris'}],
  [
    'fitting-room',
    fittingRoomMeta,
    {en: 'Fitting room', pt: 'Provador', fr: 'Cabine d’essayage'},
  ],
  ['search', searchMeta, {en: 'Search', pt: 'Pesquisar', fr: 'Rechercher'}],
];

describe('route page titles', () => {
  describe.each(PAGES)('%s', (_route, meta, expected) => {
    it.each(Object.keys(expected) as LocaleCode[])('%s', (code) => {
      expect(titleOf(meta, code)).toBe(`${expected[code]} | Jeweliette`);
    });
  });

  it('falls back to English when the root match has no locale', () => {
    const tags = cartMeta({matches: [{id: 'root'}]} as never) as Array<{
      title?: string;
    }>;
    expect(tags[0].title).toBe('Shopping bag | Jeweliette');
  });

  it.each([
    ['en', 'Product'],
    ['pt', 'Produto'],
    ['fr', 'Produit'],
  ] as const)(
    '%s: a product page without data uses the translated fallback',
    (code, fallback) => {
      expect(titleOf(productMeta, code)).toBe(`${fallback} | Jeweliette`);
    },
  );

  it('keeps the Shopify product title untranslated', () => {
    const data = {product: {title: 'Aura bracelet', seo: {}}};
    expect(titleOf(productMeta, 'pt', data)).toBe('Aura bracelet | Jeweliette');
  });
});
