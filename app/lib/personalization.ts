import type {EngravingError} from '~/lib/customization';

export type MoneyAmount = {amount: string; currencyCode: string};

/**
 * Fields every personalization row needs. Adding a new option (metal, stone,
 * artwork) means extending this base with its own editor data and adding it to
 * the `PersonalizationGroup` union.
 */
export type PersonalizationGroupBase = {
  id: string;
  label: string;
  optional: boolean;
  /** Human-readable value shown in the collapsed row. */
  summary: string;
  /** Message shown in the row when the editor has an error. */
  errorSummary: string | null;
  /** Add-on amount, or null when the option is included. */
  priceDelta: MoneyAmount | null;
};

export type EngravingGroup = PersonalizationGroupBase & {
  kind: 'engraving';
  error: EngravingError | null;
  maxLength: number;
  value: string;
};

/** Only engraving exists today; metal, stone and artwork will extend this union. */
export type PersonalizationGroup = EngravingGroup;

function toCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}

/** Sum of the priced groups, or null when every group is included. */
export function totalPersonalizationPrice(
  groups: PersonalizationGroup[],
): MoneyAmount | null {
  const priced = groups.filter(
    (group): group is PersonalizationGroup & {priceDelta: MoneyAmount} =>
      group.priceDelta !== null,
  );
  if (!priced.length) return null;

  const currencyCode = priced[0].priceDelta.currencyCode;
  if (priced.some((group) => group.priceDelta.currencyCode !== currencyCode)) {
    return null;
  }

  const cents = priced.reduce(
    (total, group) => total + toCents(group.priceDelta.amount),
    0,
  );
  return {amount: (cents / 100).toFixed(2), currencyCode};
}
