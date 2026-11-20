import type {ListOperation} from './types';

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/\d+$/;

export type GidValidator = (value: unknown) => value is string;

export function isProductGid(value: unknown): value is string {
  return typeof value === 'string' && PRODUCT_GID.test(value);
}

export function isVariantGid(value: unknown): value is string {
  return typeof value === 'string' && VARIANT_GID.test(value);
}

export function uniqueIds(ids: string[], isValid: GidValidator): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of ids) {
    if (!isValid(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

export function parseIdList(
  raw: string | null | undefined,
  max: number,
  isValid: GidValidator,
): string[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? uniqueIds(parsed as string[], isValid).slice(0, max)
      : [];
  } catch {
    return [];
  }
}

export function serializeIdList(
  ids: string[],
  max: number,
  isValid: GidValidator,
): string {
  return JSON.stringify(uniqueIds(ids, isValid).slice(0, max));
}

export function applyIdOperation(
  current: string[],
  operation: ListOperation,
  max: number,
  isValid: GidValidator,
): string[] {
  let next = uniqueIds(current, isValid);

  if (operation.remove?.length) {
    const removed = new Set(operation.remove);
    next = next.filter((id) => !removed.has(id));
  }

  if (operation.add?.length) {
    const added = uniqueIds(operation.add, isValid).filter(
      (id) => !next.includes(id),
    );
    next = [...added, ...next];
  }

  return next.slice(0, max);
}

// Product-GID helpers, kept for favourites and the earlier API shape.

export function uniqueProductIds(ids: string[]): string[] {
  return uniqueIds(ids, isProductGid);
}

export function parseProductIdList(
  raw: string | null | undefined,
  max: number,
): string[] {
  return parseIdList(raw, max, isProductGid);
}

export function serializeProductIdList(ids: string[], max: number): string {
  return serializeIdList(ids, max, isProductGid);
}

export function applyProductIdOperation(
  current: string[],
  operation: ListOperation,
  max: number,
): string[] {
  return applyIdOperation(current, operation, max, isProductGid);
}
