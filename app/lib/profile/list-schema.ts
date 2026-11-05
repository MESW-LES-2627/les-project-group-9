import type {ListOperation} from './types';

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;

export function isProductGid(value: unknown): value is string {
  return typeof value === 'string' && PRODUCT_GID.test(value);
}

export function uniqueProductIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of ids) {
    if (!isProductGid(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

export function parseProductIdList(
  raw: string | null | undefined,
  max: number,
): string[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? uniqueProductIds(parsed as string[]).slice(0, max)
      : [];
  } catch {
    return [];
  }
}

export function serializeProductIdList(ids: string[], max: number): string {
  return JSON.stringify(uniqueProductIds(ids).slice(0, max));
}

export function applyProductIdOperation(
  current: string[],
  operation: ListOperation,
  max: number,
): string[] {
  let next = uniqueProductIds(current);

  if (operation.remove?.length) {
    const removed = new Set(operation.remove);
    next = next.filter((id) => !removed.has(id));
  }

  if (operation.add?.length) {
    const added = uniqueProductIds(operation.add).filter(
      (id) => !next.includes(id),
    );
    next = [...added, ...next];
  }

  return next.slice(0, max);
}
