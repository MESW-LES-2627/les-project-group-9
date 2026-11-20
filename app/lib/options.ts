import {normalizeValue} from './metafields';

/**
 * Option names that behave like a colour or a size on product pages.
 *
 * Shopify localises option names (`Color` → `Cor` → `Couleur`), so the app
 * must recognise the localized word instead of a single English spelling.
 * Matching is token-based so `Cor da banda` and `Band color` are recognised
 * too. Keep this in one place so the form, cards, materials and
 * recommendations agree.
 */
const COLOR_TOKENS = new Set([
  'color',
  'colour',
  'cor',
  'couleur',
  'finish',
  'acabamento',
  'finition',
  'metal',
  'metalico',
  'metallique',
]);

const SIZE_TOKENS = new Set(['size', 'tamanho', 'taille']);

function hasToken(name: string, tokens: Set<string>): boolean {
  return normalizeValue(name)
    .split('-')
    .some((token) => tokens.has(token));
}

export function isColorOption(name: string): boolean {
  return hasToken(name, COLOR_TOKENS);
}

export function isSizeOption(name: string): boolean {
  return hasToken(name, SIZE_TOKENS);
}
