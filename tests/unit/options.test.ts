import {describe, expect, it} from 'vitest';
import {isColorOption, isSizeOption} from '../../app/lib/options';

describe('isColorOption', () => {
  it.each(['Color', 'Colour', 'Finish', 'Metal'])(
    'recognises the English %s option',
    (name) => {
      expect(isColorOption(name)).toBe(true);
    },
  );

  it.each(['Cor', 'Acabamento', 'Couleur', 'Finition'])(
    'recognises the localized %s option',
    (name) => {
      expect(isColorOption(name)).toBe(true);
    },
  );

  it.each(['Cor da banda', 'Band color'])(
    'recognises the compound %s option',
    (name) => {
      expect(isColorOption(name)).toBe(true);
    },
  );

  it.each(['Size', 'Tamanho', 'Title', 'Gemstone'])(
    'rejects the %s option',
    (name) => {
      expect(isColorOption(name)).toBe(false);
    },
  );
});

describe('isSizeOption', () => {
  it.each(['Size', 'Tamanho', 'Taille'])(
    'recognises the %s option',
    (name) => {
      expect(isSizeOption(name)).toBe(true);
    },
  );

  it.each(['Color', 'Cor', 'Title', 'Gemstone'])(
    'rejects the %s option',
    (name) => {
      expect(isSizeOption(name)).toBe(false);
    },
  );
});
