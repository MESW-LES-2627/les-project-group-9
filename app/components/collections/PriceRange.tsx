import {useState} from 'react';
import {parseFilterObject} from '~/lib/search';
import {useTranslation} from '~/lib/i18n';

type Props = {
  values: Array<{input: unknown}>;
  priceMin: string;
  priceMax: string;
  currencyCode?: string;
};

const rangeClass =
  'pointer-events-none absolute inset-0 h-8 w-full appearance-none bg-transparent ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto ' +
  '[&::-webkit-slider-thumb]:size-5 ' +
  '[&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:border-2 ' +
  '[&::-webkit-slider-thumb]:border-paper ' +
  '[&::-webkit-slider-thumb]:bg-primary ' +
  '[&::-moz-range-thumb]:pointer-events-auto ' +
  '[&::-moz-range-thumb]:size-5 ' +
  '[&::-moz-range-thumb]:rounded-full ' +
  '[&::-moz-range-thumb]:border-2 ' +
  '[&::-moz-range-thumb]:border-paper ' +
  '[&::-moz-range-thumb]:bg-primary';

export function PriceRange(props: Props) {
  const t = useTranslation();
  const object = parseFilterObject(props.values[0]?.input);
  const price = parseFilterObject(object.price);

  const rawMin = Number(price.min ?? 0);
  const rawMax = Number(price.max);

  if (
    !Number.isFinite(rawMin) ||
    !Number.isFinite(rawMax) ||
    rawMax <= rawMin
  ) {
    return (
      <p className="text-sm text-primary">
        {t('price.noRange')}
      </p>
    );
  }

  // Include an existing URL range even if the returned bounds narrow.
  const min = Math.min(
    Math.floor(rawMin),
    props.priceMin ? Number(props.priceMin) : rawMin,
  );

  const max = Math.max(
    Math.ceil(rawMax),
    props.priceMax ? Number(props.priceMax) : rawMax,
  );

  return (
    <PriceRangeFields
      key={`${min}:${max}:${props.priceMin}:${props.priceMax}`}
      {...props}
      min={min}
      max={max}
    />
  );
}

function PriceRangeFields({
                            min,
                            max,
                            priceMin,
                            priceMax,
                            currencyCode,
                          }: Props & {min: number; max: number}) {
  const t = useTranslation();
  const [lower, setLower] = useState(
    priceMin || String(min),
  );
  const [upper, setUpper] = useState(
    priceMax || String(max),
  );

  const low = Number(lower);
  const high = Number(upper);

  const valid =
    lower !== '' &&
    upper !== '' &&
    Number.isFinite(low) &&
    Number.isFinite(high) &&
    low >= min &&
    high <= max &&
    low <= high;

  const clamp = (value: number) =>
    Math.max(min, Math.min(max, value));

  const sliderLow = clamp(
    Number.isFinite(low) ? low : min,
  );

  const sliderHigh = clamp(
    Number.isFinite(high) ? high : max,
  );

  const left = ((sliderLow - min) / (max - min)) * 100;
  const right = 100 -
    ((sliderHigh - min) / (max - min)) * 100;

  const fieldClass =
    'mt-2 min-h-11 w-full border border-line bg-paper px-3 text-base';

  return (
    <div className="w-64 space-y-5" data-price-filter>
      {currencyCode ? (
        <p className="text-xs text-primary">
          {currencyCode}
        </p>
      ) : null}

      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-secondary" />

        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 bg-primary"
          style={{
            left: `${Math.min(left, 100 - right)}%`,
            right: `${right}%`,
          }}
        />

        <input
          type="range"
          aria-label={t('price.minLabel')}
          min={min}
          max={max}
          step="0.01"
          value={sliderLow}
          onChange={(event) =>
            setLower(
              String(
                Math.min(
                  Number(event.target.value),
                  sliderHigh,
                ),
              ),
            )
          }
          className={rangeClass}
          style={{zIndex: sliderLow === max ? 5 : 3}}
        />

        <input
          type="range"
          aria-label={t('price.maxLabel')}
          min={min}
          max={max}
          step="0.01"
          value={sliderHigh}
          onChange={(event) =>
            setUpper(
              String(
                Math.max(
                  Number(event.target.value),
                  sliderLow,
                ),
              ),
            )
          }
          className={rangeClass}
          style={{zIndex: 4}}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-primary">
          {t('price.min')}
          <input
            name="priceMin"
            type="number"
            min={min}
            max={max}
            step="0.01"
            required
            value={lower}
            onChange={(event) =>
              setLower(event.target.value)
            }
            className={fieldClass}
          />
        </label>

        <label className="text-xs text-primary">
          {t('price.max')}
          <input
            name="priceMax"
            type="number"
            min={min}
            max={max}
            step="0.01"
            required
            value={upper}
            onChange={(event) =>
              setUpper(event.target.value)
            }
            className={fieldClass}
          />
        </label>
      </div>

      {!valid ? (
        <p role="status" className="text-xs text-red-800">
          {t('price.invalid')}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!valid}
        className="min-h-11 w-full bg-primary px-4 text-xs uppercase tracking-widest text-white disabled:opacity-50"
      >
        {t('price.apply')}
      </button>
    </div>
  );
}