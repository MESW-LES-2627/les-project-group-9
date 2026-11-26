import {useId, useState, type ReactNode} from 'react';
import {useTranslation} from '~/lib/i18n';
import {
  totalPersonalizationPrice,
  type PersonalizationGroup,
} from '~/lib/personalization';
import {PersonalizationRow} from './PersonalizationRow';
import {PriceDelta} from './PriceDelta';

type PersonalizationSectionProps = {
  groups: PersonalizationGroup[];
  renderEditor: (group: PersonalizationGroup) => ReactNode;
};

/**
 * The shared foundation for product personalization.
 *
 * One group renders as a single open row (the engraving-only case), with no
 * section chrome. Two or more groups switch to a dedicated summary section with
 * one editor open at a time. Adding a group later does not require a PDP redesign.
 */
export function PersonalizationSection({
  groups,
  renderEditor,
}: PersonalizationSectionProps) {
  const t = useTranslation();
  const titleId = useId();
  const rowId = useId();
  const panelId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  if (groups.length === 0) return null;

  if (groups.length === 1) {
    const group = groups[0];

    return (
      <div className="space-y-3">
        <PersonalizationRow
          group={group}
          rowId={rowId}
          panelId={panelId}
          open
          interactive={false}
        />
        <div id={panelId} role="region" aria-labelledby={rowId}>
          {renderEditor(group)}
        </div>
      </div>
    );
  }

  const total = totalPersonalizationPrice(groups);

  return (
    <section aria-labelledby={titleId} className="space-y-3">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <h2
          id={titleId}
          className="text-[11px] uppercase tracking-widest text-ink"
        >
          {t('product.customize.sectionTitle')}
        </h2>
        <PriceDelta price={total} className="text-xs text-ink" />

      </div>

      <div className="divide-y divide-line border-b border-line">
        {groups.map((group, index) => {
          const groupRowId = `${rowId}-${index}`;
          const groupPanelId = `${panelId}-${index}`;
          const open = activeId === group.id;

          return (
            <div key={group.id}>
              <PersonalizationRow
                group={group}
                rowId={groupRowId}
                panelId={groupPanelId}
                open={open}
                interactive
                onToggle={() =>
                  setActiveId(open ? null : group.id)
                }
              />
              {open ? (
                <div
                  id={groupPanelId}
                  role="region"
                  aria-labelledby={groupRowId}
                  className="pb-4"
                >
                  {renderEditor(group)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
