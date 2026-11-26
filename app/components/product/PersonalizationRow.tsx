import {Icon} from '~/components/shared/Icon';
import {useTranslation} from '~/lib/i18n';
import type {PersonalizationGroupBase} from '~/lib/personalization';
import {PriceDelta} from './PriceDelta';

type PersonalizationRowProps = {
  group: PersonalizationGroupBase;
  rowId: string;
  panelId?: string;
  open: boolean;
  interactive: boolean;
  onToggle?: () => void;
};

/** Summary row for one personalization option; controls live in the editor below. */
export function PersonalizationRow({
  group,
  rowId,
  panelId,
  open,
  interactive,
  onToggle,
}: PersonalizationRowProps) {
  const t = useTranslation();
  const summary = group.errorSummary ?? group.summary;

  const content = (
    <>
      <span className="min-w-0 text-[11px] uppercase tracking-widest text-ink">
        {group.label}
        {group.optional ? (
          <span className="ml-2 normal-case tracking-normal text-primary">
            {t('product.customize.optional')}
          </span>
        ) : null}
      </span>

      <span className="ml-auto flex min-w-0 items-center gap-3 text-right">
        {summary ? (
          <span
            className={`truncate text-xs ${
              group.errorSummary ? 'text-red-700' : 'text-primary'
            }`}
          >
            {summary}
          </span>
        ) : null}
        <PriceDelta
          price={group.priceDelta}
          className="shrink-0 text-xs text-ink"
        />
        {interactive ? (
          <Icon
            name="chevron"
            size={16}
            className={`shrink-0 text-primary transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        ) : null}
      </span>
    </>
  );

  if (!interactive) {
    return (
      <div id={rowId} className="flex min-h-12 items-center gap-3">
        {content}
      </div>
    );
  }

  return (
    <button
      id={rowId}
      type="button"
      aria-controls={open ? panelId : undefined}
      aria-expanded={open}
      onClick={onToggle}
      className="flex min-h-12 w-full items-center gap-3 text-left"
    >
      {content}
    </button>
  );
}
