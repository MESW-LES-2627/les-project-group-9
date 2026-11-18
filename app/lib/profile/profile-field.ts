import {
  applyIdOperation,
  isProductGid,
  parseIdList,
  serializeIdList,
  type GidValidator,
} from './list-schema';
import type {CustomerProfile, ListOperation} from './types';


export abstract class ProfileField<T, Change> {
  /** Metafield key in the `custom` namespace. */
  abstract readonly key: string;

  abstract parse(raw: string | null | undefined): T;

  abstract serialize(value: T): string;

  protected abstract current(profile: CustomerProfile): T;

  protected abstract merge(current: T, change: Change): T;

  /** The serialized value after applying `change` to the stored profile. */
  nextValue(profile: CustomerProfile, change: Change): string {
    return this.serialize(this.merge(this.current(profile), change));
  }
}

/**
 * A capped list of Shopify GIDs. The validator decides which resource the list
 * stores: products for favorites, variants for the fitting room.
 */
export abstract class GidList extends ProfileField<string[], ListOperation> {
  abstract readonly max: number;
  abstract readonly isValidId: GidValidator;

  parse(raw: string | null | undefined): string[] {
    return parseIdList(raw, this.max, this.isValidId);
  }

  serialize(ids: string[]): string {
    return serializeIdList(ids, this.max, this.isValidId);
  }

  apply(current: string[], operation: ListOperation): string[] {
    return applyIdOperation(current, operation, this.max, this.isValidId);
  }

  protected merge(current: string[], operation: ListOperation): string[] {
    return this.apply(current, operation);
  }
}

/** Product-GID list: favorites. */
export abstract class ProductIdList extends GidList {
  readonly isValidId = isProductGid;
}
