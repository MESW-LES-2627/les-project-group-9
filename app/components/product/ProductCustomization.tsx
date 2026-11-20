import {useId} from 'react';
import {useTranslation} from '~/lib/i18n';
import type {
  CustomizationChoice,
  ProductCustomization as Customization,
} from '~/lib/customization';

type ProductCustomizationProps = {
  customization: Customization;
  value: CustomizationChoice;
  onChange: (value: CustomizationChoice) => void;
};

/** Gem color and engraving controls; the parent owns the choice and adds it to the cart line. */
export function ProductCustomization({
  customization,
  value,
  onChange,
}: ProductCustomizationProps) {
  const t = useTranslation();
  const titleId = useId();
  const engravingId = useId();
  const hintId = useId();
  const {gemColors, engravingMaxLength} = customization;

  return (
    <section aria-labelledby={titleId} className="space-y-6">
      <h2 id={titleId} className="text-[11px] uppercase tracking-widest">
        {t('product.customize.title')}
      </h2>

      {gemColors.length > 0 ? (
        <fieldset>
          <legend className="text-sm text-primary">
            {t('product.detail.gemColor')}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {gemColors.map((color) => (
              <label
                key={color.value}
                className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center rounded-full border border-line px-4 text-sm has-[:checked]:border-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
              >
                <input
                  type="radio"
                  name="gemColor"
                  value={color.value}
                  checked={value.gemColor === color.value}
                  onChange={() => onChange({...value, gemColor: color.value})}
                  className="sr-only"
                />
                {color.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {engravingMaxLength !== null ? (
        <div>
          <label htmlFor={engravingId} className="text-sm text-primary">
            {t('product.customize.engraving')}
          </label>
          <input
            id={engravingId}
            type="text"
            name="engraving"
            maxLength={engravingMaxLength}
            value={value.engraving}
            onChange={(event) =>
              onChange({...value, engraving: event.target.value})
            }
            aria-describedby={hintId}
            className="mt-2 block min-h-[44px] w-full border border-line px-3 text-sm"
          />
          <p
            id={hintId}
            aria-live="polite"
            className="mt-2 text-xs text-primary"
          >
            {t('product.customize.engravingRemaining', {
              count: engravingMaxLength - value.engraving.length,
            })}
          </p>
        </div>
      ) : null}
    </section>
  );
}
