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

function undertonesFromMetal(metal: string[]): string[] {
  const undertones = new Set<string>();

  for (const value of metal) {
    if (value.includes('gold')) undertones.add('warm');
    if (value.includes('silver')) undertones.add('cool');
  }

  return Array.from(undertones);
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
  const metal = parseTextMetafield(product.metal?.value);

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
    metal,
    gemstones: parseListMetafield(product.gemstone?.value),
    gemColors: parseListMetafield(product.gemColor?.value),
    skinTones: [],
    undertones: undertonesFromMetal(metal),
    allergens: [],
  };
}
