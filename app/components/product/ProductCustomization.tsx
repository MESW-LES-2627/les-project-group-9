import {useTranslation} from '~/lib/i18n';
import {
  normalizeEngraving,
  type CustomizationChoice,
  type EngravingError,
  type ProductCustomization as Customization,
} from '~/lib/customization';
import type {PersonalizationGroup} from '~/lib/personalization';
import {EngravingEditor} from './EngravingEditor';
import {PersonalizationSection} from './PersonalizationSection';

type ProductCustomizationProps = {
  customization: Customization;
  value: CustomizationChoice;
  onChange: (value: CustomizationChoice) => void;
  /** Computed by ProductForm so the CTA can be disabled at the same time. */
  engravingError: EngravingError | null;
};

/**
 * Existing gem-colour field plus the new personalization section foundation.
 * Gem colours are intentionally left untouched; only engraving uses the section.
 */
export function ProductCustomization({
  customization,
  value,
  onChange,
  engravingError,
}: ProductCustomizationProps) {
  const t = useTranslation();
  const {gemColors, engravingMaxLength} = customization;
  const normalized = normalizeEngraving(value.engraving);

  const groups: PersonalizationGroup[] =
    engravingMaxLength !== null
      ? [
          {
            kind: 'engraving',
            id: 'engraving',
            label: t('product.customize.engraving'),
            optional: true,
            summary: normalized
              ? t('product.customize.engravingSummary', {text: normalized})
              : '',
            errorSummary: engravingError
              ? t('product.customize.engravingCheck')
              : null,
            priceDelta: null,
            error: engravingError,
            maxLength: engravingMaxLength,
            value: value.engraving,
          },
        ]
      : [];

  return (
    <div className="space-y-6">
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

      <PersonalizationSection
        groups={groups}
        renderEditor={(group) =>
          group.kind === 'engraving' ? (
            <EngravingEditor
              label={group.label}
              maxLength={group.maxLength}
              value={group.value}
              error={group.error}
              onChange={(engraving) => onChange({...value, engraving})}
            />
          ) : null
        }
      />
    </div>
  );
}
