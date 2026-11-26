import {useId} from 'react';
import {useTranslation} from '~/lib/i18n';
import {
  engravingLength,
  normalizeEngraving,
  type EngravingError,
} from '~/lib/customization';

type EngravingEditorProps = {
  label: string;
  maxLength: number;
  value: string;
  error: EngravingError | null;
  onChange: (value: string) => void;
};

/**
 * The open engraving editor. Case is preserved; the preview shows exactly what
 * will be sent with the cart line, apart from leading/trailing whitespace.
 */
export function EngravingEditor({
  label,
  maxLength,
  value,
  error,
  onChange,
}: EngravingEditorProps) {
  const t = useTranslation();
  const inputId = useId();
  const messageId = useId();
  const counterId = useId();

  const normalized = normalizeEngraving(value);
  const count = engravingLength(value);
  const errorMessage =
    error === 'too-long'
      ? t('product.customize.engravingTooLong', {count: maxLength})
      : error === 'invalid-characters'
        ? t('product.customize.engravingInvalid')
        : null;
  const placeholder =
    maxLength === 1
      ? t('product.customize.engravingPlaceholderSingle')
      : t('product.customize.engravingPlaceholderDefault');

  return (
    <div className="space-y-2" data-engraving-editor>
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        name="engraving"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          const normalized = normalizeEngraving(value);
          if (normalized !== value) onChange(normalized);
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error !== null}
        aria-describedby={errorMessage ? `${messageId} ${counterId}` : counterId}
        className={`block min-h-[44px] w-full border bg-paper px-3 text-sm text-ink outline-none placeholder:text-primary/60 focus:border-ink ${
          error ? 'border-red-700' : 'border-line'
        }`}
      />

      <div className="flex items-start justify-between gap-4">
        {errorMessage ? (
          <p
            id={messageId}
            role="alert"
            className="text-xs leading-5 text-red-700"
          >
            {errorMessage}
          </p>
        ) : null}
        <span
          id={counterId}
          aria-live="polite"
          className={`ml-auto shrink-0 text-[10px] uppercase tracking-[0.14em] ${
            error === 'too-long' ? 'text-red-700' : 'text-primary'
          }`}
        >
          {t('product.customize.engravingCounter', {count, max: maxLength})}
        </span>
      </div>

      {normalized ? (
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <span className="text-[10px] uppercase tracking-[0.16em] text-primary">
            {t('product.customize.engravingPreview')}
          </span>
          <span className="break-words text-right font-display text-base italic text-ink">
            {normalized}
          </span>
        </div>
      ) : null}
    </div>
  );
}
