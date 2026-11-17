import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import type {JeweliettePreferenceOptionsQuery} from 'storefrontapi.generated';
import {JEWELIETTE_MATERIAL_METAFIELD_FRAGMENT} from '~/lib/jeweliette-catalog';
import {parseProductMaterials} from '~/lib/materials';
import {productColorValues} from '~/lib/product-colors';
import type {
  PreferenceOption,
  PreferenceOptions,
} from './types';

type Context = Pick<HydrogenRouterContextProvider, 'storefront'>;

const PREFERENCE_OPTIONS_QUERY = `#graphql
  ${JEWELIETTE_MATERIAL_METAFIELD_FRAGMENT}

  query JeweliettePreferenceOptions(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: 250) {
      nodes {
        metal: metafield(namespace: "custom", key: "metal") {
          value
        }
        options {
          name
          optionValues {
            name
          }
        }
        jewelryMaterial: metafield(
          namespace: "shopify"
          key: "jewelry-material"
        ) {
          ...JewelietteMaterialMetafield
        }
        watchMaterial: metafield(
          namespace: "shopify"
          key: "watch-material"
        ) {
          ...JewelietteMaterialMetafield
        }
      }
    }
  }
` as const;

/** `rose-gold` → `Rose gold`, matching the catalog's display style. */
export function labelizeOption(value: string): string {
  const text = value.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function byLabel(a: PreferenceOption, b: PreferenceOption): number {
  return a.label.localeCompare(b.label, 'en');
}

/**
 * Reads the colours and materials the current catalog actually uses. The
 * profile form offers exactly these values, so every choice can match a
 * product in the recommendation engine and the collection sort.
 */
export async function getPreferenceOptions(
  context: Context,
): Promise<PreferenceOptions> {
  try {
    const {products} = await context.storefront.query<JeweliettePreferenceOptionsQuery>(
      PREFERENCE_OPTIONS_QUERY,
      {cache: context.storefront.CacheShort()},
    );

    const colors = new Map<string, PreferenceOption>();
    const materials = new Map<string, PreferenceOption>();

    for (const product of products.nodes) {
      for (const value of productColorValues(product)) {
        if (!colors.has(value)) {
          colors.set(value, {value, label: labelizeOption(value)});
        }
      }

      for (const material of parseProductMaterials(product)) {
        if (!materials.has(material.handle)) {
          materials.set(material.handle, {
            value: material.handle,
            label: material.label,
          });
        }
      }
    }

    return {
      colors: Array.from(colors.values()).sort(byLabel),
      materials: Array.from(materials.values()).sort(byLabel),
    };
  } catch (error) {
    console.error('Preference options query failed', error);
    return {colors: [], materials: []};
  }
}
