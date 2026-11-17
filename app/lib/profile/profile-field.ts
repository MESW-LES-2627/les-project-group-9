import {
  applyProductIdOperation,
  parseProductIdList,
  serializeProductIdList,
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

export abstract class ProductIdList extends ProfileField<
  string[],
  ListOperation
> {

  abstract readonly max: number;

  parse(raw: string | null | undefined): string[] {
    return parseProductIdList(raw, this.max);
  }

  serialize(ids: string[]): string {
    return serializeProductIdList(ids, this.max);
  }

  apply(current: string[], operation: ListOperation): string[] {
    return applyProductIdOperation(current, operation, this.max);
  }

  protected merge(current: string[], operation: ListOperation): string[] {
    return this.apply(current, operation);
  }
}
