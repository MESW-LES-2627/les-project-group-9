import type {CatalogProductWithTraits} from '~/lib/jeweliette-catalog';
import type {ProductTraits} from './types';

export function normalizeTraitValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function parseTextMetafield(value: string | null | undefined): string[] {
  if (!value) return [];
  return dedupe(value.split(',').map(normalizeTraitValue).filter(Boolean));
}

function parseListMetafield(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return dedupe(
      parsed
        .filter((item): item is string => typeof item === 'string')
        .map(normalizeTraitValue)
        .filter(Boolean),
    );
  } catch {
    return [];
  }
}

export function toProductTraits(product: CatalogProductWithTraits): ProductTraits {
  return {
    id: product.id,
    collections:
      product.collections?.nodes.map((collection) =>
        normalizeTraitValue(collection.handle),
      ) ?? [],
    category: product.category?.id
      ? [normalizeTraitValue(product.category.id)]
      : [],
    material: parseTextMetafield(product.material?.value),
    metal: parseTextMetafield(product.metal?.value),
    gemstones: parseListMetafield(product.gemstone?.value),
    gemColors: parseListMetafield(product.gemColor?.value),
    skinTones: [],
    undertones: [],
    allergens: [],
  };
}
