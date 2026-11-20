import {useId} from 'react';
import {useTranslation} from '~/lib/i18n';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {TryOnButton} from './TryOnButton';

type TryOnSectionProps = {
  piece: TryOnPiece;
  title: string;
  isMobile: boolean;
};

/**
 * Try-on block below Add to bag: a hairline separates the primary purchase
 * action from this secondary one, and the eyebrow title replaces the old hint
 * so the section reads as part of the page's accordion rhythm.
 */
export function TryOnSection({piece, title, isMobile}: TryOnSectionProps) {
  const t = useTranslation();
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="mt-8 border-t border-line pt-6"
    >
      <h2
        className="text-[11px] uppercase tracking-[0.2em] text-primary"
        id={headingId}
      >
        {t('product.tryOnTitle')}
      </h2>
      <div className="mt-3">
        <TryOnButton isMobile={isMobile} piece={piece} title={title} />
      </div>
    </section>
  );
}
