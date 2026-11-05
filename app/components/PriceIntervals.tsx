type FilterValue = {
  input: unknown;
};

type Props = {
  values: FilterValue[];
  priceMin: string;
  priceMax: string;
  currencyCode?: string;
};

function getPriceBounds(values: FilterValue[]) {
  try {
    const raw = values[0]?.input;
    const parsed =
      typeof raw === 'string' ? JSON.parse(raw) : raw;

    const min = Number(parsed?.price?.min ?? 0);
    const max = Number(parsed?.price?.max);

    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      max <= min
    ) {
      return null;
    }

    return {
      min: Math.floor(min),
      max: Math.ceil(max),
    };
  } catch {
    return null;
  }
}

export function PriceIntervals({
                                 values,
                                 priceMin,
                                 priceMax,
                                 currencyCode,
                               }: Props) {
  const bounds = getPriceBounds(values);

  const format = (value: number) =>
    currencyCode
      ? new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(value)
      : String(value);

  const edges = bounds
    ? Array.from(
      new Set(
        Array.from({length: 5}, (_, index) =>
          Math.round(
            bounds.min +
            ((bounds.max - bounds.min) * index) / 4,
          ),
        ),
      ),
    )
    : [];

  const ranges = edges.slice(0, -1).map((min, index) => ({
    min,
    max: edges[index + 1],
  }));

  const active = (min: number, max: number) =>
    priceMin !== '' &&
    priceMax !== '' &&
    Number(priceMin) === min &&
    Number(priceMax) === max;

  return (
    <div className="min-w-56 space-y-2">
      <input type="hidden" name="priceMin" value={priceMin} />
      <input type="hidden" name="priceMax" value={priceMax} />

      {priceMin || priceMax ? (
        <p className="mb-3 text-sm text-primary">
          Current: {priceMin ? format(Number(priceMin)) : 'Any'}
          {' – '}
          {priceMax ? format(Number(priceMax)) : 'Any'}
        </p>
      ) : null}

      <button
        type="button"
        className="block min-h-11 w-full text-left text-sm hover:text-primary"
        onClick={(event) => {
          const form = event.currentTarget.form;
          if (!form) return;

          (
            form.elements.namedItem('priceMin') as HTMLInputElement
          ).value = '';

          (
            form.elements.namedItem('priceMax') as HTMLInputElement
          ).value = '';

          form.requestSubmit();
        }}
      >
        All prices
      </button>

      {ranges.map(({min, max}) => (
        <button
          key={`${min}-${max}`}
          type="button"
          aria-pressed={active(min, max)}
          className={`block min-h-11 w-full border px-3 text-left text-sm transition-colors ${
            active(min, max)
              ? 'border-primary bg-primary text-white'
              : 'border-line hover:border-primary'
          }`}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (!form) return;

            (
              form.elements.namedItem(
                'priceMin',
              ) as HTMLInputElement
            ).value = String(min);

            (
              form.elements.namedItem(
                'priceMax',
              ) as HTMLInputElement
            ).value = String(max);

            form.requestSubmit();
          }}
        >
          {format(min)} – {format(max)}
        </button>
      ))}

      {!bounds ? (
        <p className="text-sm text-primary">
          No price intervals available.
        </p>
      ) : null}
    </div>
  );
}