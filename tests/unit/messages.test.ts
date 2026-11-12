import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {en, type PluralMessage} from '../../app/lib/messages/en';
import {fr} from '../../app/lib/messages/fr';
import {pt} from '../../app/lib/messages/pt';

type Message = string | PluralMessage;
type Catalogue = Record<string, Message>;

const reference = en as Catalogue;
const translations: Record<'pt' | 'fr', {messages: Catalogue; tag: string}> = {
  pt: {messages: pt as Catalogue, tag: 'pt-PT'},
  fr: {messages: fr as Catalogue, tag: 'fr-FR'},
};

const NBSP = String.fromCodePoint(0xa0);
const NNBSP = String.fromCodePoint(0x202f);

function forms(message: Message): string[] {
  return typeof message === 'string' ? [message] : Object.values(message);
}

/** App source outside the catalogues, where keys are used. */
function appSource(dir = join(__dirname, '../../app')): string {
  return readdirSync(dir)
    .map((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        return path.endsWith(join('lib', 'messages')) ? '' : appSource(path);
      }
      return /\.(ts|tsx)$/.test(name) ? readFileSync(path, 'utf8') : '';
    })
    .join('\n');
}

/**
 * A key is used when it appears as a string literal, or when its prefix is
 * built in a template such as `allergen.${value}` (the last segment is a code).
 */
function isUsed(key: string, source: string): boolean {
  const literal = new RegExp(`['"\`]${escapeRegExp(key)}['"\`]`);
  const prefix = key.slice(0, key.lastIndexOf('.') + 1);
  return (
    literal.test(source) ||
    (prefix !== '' && source.includes(`\`${prefix}\${`))
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function placeholders(message: Message): string[] {
  const names = forms(message).flatMap((text) =>
    Array.from(text.matchAll(/\{(\w+)\}/g), (match) => match[1]),
  );
  return Array.from(new Set(names)).sort();
}

describe('UI message catalogues', () => {
  it.each(Object.keys(translations) as Array<keyof typeof translations>)(
    '%s has exactly the English keys',
    (code) => {
      expect(Object.keys(translations[code].messages).sort()).toEqual(
        Object.keys(reference).sort(),
      );
    },
  );

  it('has no unused keys', () => {
    const source = appSource();
    const unused = Object.keys(reference).filter(
      (key) => !isUsed(key, source),
    );

    expect(unused).toEqual([]);
  });

  it('has no empty message in any language', () => {
    for (const catalogue of [reference, pt as Catalogue, fr as Catalogue]) {
      for (const [key, message] of Object.entries(catalogue)) {
        for (const text of forms(message)) {
          expect(text.trim(), key).not.toBe('');
        }
      }
    }
  });

  it('keeps the same placeholders as English in every language', () => {
    for (const [key, message] of Object.entries(reference)) {
      const expected = placeholders(message);
      for (const {messages} of Object.values(translations)) {
        expect(placeholders(messages[key]), key).toEqual(expected);
      }
    }
  });

  it('keeps plural messages plural, with an "other" form and valid categories', () => {
    for (const [key, message] of Object.entries(reference)) {
      if (typeof message === 'string') continue;

      for (const {messages, tag} of Object.values(translations)) {
        const translated = messages[key];
        expect(typeof translated, key).toBe('object');
        if (typeof translated === 'string') continue;

        expect(translated.other, key).toBeTruthy();
        const categories = new Intl.PluralRules(tag).resolvedOptions()
          .pluralCategories as string[];
        for (const category of Object.keys(translated)) {
          expect(categories, `${key} (${tag})`).toContain(category);
        }
      }
    }
  });

  it('uses the agreed glossary terms', () => {
    expect(pt['nav.shoppingBag']).toBe('Saco de compras');
    expect(fr['nav.shoppingBag']).toBe('Panier');
    expect(pt['nav.fittingRoom']).toBe('Provador');
    expect(fr['nav.fittingRoom']).toBe('Cabine d’essayage');
    expect(pt['product.addToBag']).toBe('Adicionar ao saco');
    expect(fr['product.addToBag']).toBe('Ajouter au panier');
    expect(pt['product.soldOut']).toBe('Esgotado');
    expect(fr['product.soldOut']).toBe('Épuisé');
  });

  it('follows French spacing: no-break spaces before ":" ";" "!" "?" and inside « »', () => {
    for (const [key, message] of Object.entries(fr as Catalogue)) {
      for (const text of forms(message)) {
        // A plain space before high punctuation would let the line break there.
        expect(text, key).not.toMatch(/ [:;!?]/);
        expect(text, key).not.toMatch(/« | »/);
        if (/[;!?]/.test(text)) {
          expect(text, key).toMatch(new RegExp(`${NNBSP}[;!?]`));
        }
        if (text.includes('«')) {
          expect(text, key).toContain(`«${NBSP}`);
        }
      }
    }
  });
});
