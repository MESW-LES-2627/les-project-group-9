import {Image} from '@shopify/hydrogen';
import {Money} from '~/components/shared/Money';
import {Icon} from '~/components/shared/Icon';
import type {FittingRoomPiece} from '~/lib/profile/fitting-room';
import {useTranslation} from '~/lib/i18n';
import {FittingRoomLookTryOn} from './FittingRoomLookTryOn';

type FittingRoomViewProps = {
  pieces: FittingRoomPiece[];
  selectedIds: string[];
  movingId: string | null;
  /** Phone/tablet request, detected on the server. */
  isMobile: boolean;
  onToggle: (variantId: string) => void;
  onRemove: (variantId: string) => void;
  onMoveToCart: (variantId: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
};

/** "Aura Bracelet · Clear"; Shopify's "Default Title" is hidden. */
function pieceTitle(piece: FittingRoomPiece): string {
  const variant = piece.variantTitle.trim();

  if (!variant || /^default title$/i.test(variant)) {
    return piece.product.title;
  }

  return `${piece.product.title} · ${variant}`;
}

export function FittingRoomView({
  pieces,
  selectedIds,
  movingId,
  isMobile,
  onToggle,
  onRemove,
  onMoveToCart,
  onSelectAll,
  onClear,
}: FittingRoomViewProps) {
  const t = useTranslation();
  const selectedLook = pieces.filter(
    (piece) => selectedIds.includes(piece.variantId) && piece.tryOn !== null,
  );

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10">
      <section aria-label={t('fittingRoom.listLabel')}>
        <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
            {t('fittingRoom.count', {count: pieces.length})}
          </p>
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-primary">
            <button
              className="hover:text-bark"
              onClick={onSelectAll}
              type="button"
            >
              {t('fittingRoom.selectAll')}
            </button>
            <button className="hover:text-bark" onClick={onClear} type="button">
              {t('fittingRoom.clear')}
            </button>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {pieces.map((piece) => {
            const title = pieceTitle(piece);
            const checked = selectedIds.includes(piece.variantId);
            const moving = movingId === piece.variantId;
            const canTryOn = piece.tryOn !== null;

            return (
              <li key={piece.variantId} className="py-4">
                <label
                  className={`flex items-center gap-4 ${
                    canTryOn ? 'cursor-pointer' : 'cursor-default'
                  } transition-opacity ${checked ? 'opacity-100' : 'opacity-60'}`}
                >
                  <input
                    aria-label={t('fittingRoom.select', {title})}
                    checked={checked}
                    className="h-4 w-4 shrink-0 accent-ink disabled:cursor-not-allowed"
                    disabled={!canTryOn}
                    onChange={() => onToggle(piece.variantId)}
                    type="checkbox"
                  />
                  <span className="relative block h-20 w-16 shrink-0 overflow-hidden bg-secondary">
                    {piece.image ? (
                      <Image
                        alt={piece.image.altText || title}
                        className="h-full w-full object-cover"
                        data={piece.image}
                        sizes="64px"
                        width={128}
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg text-ink">
                      {piece.product.title}
                    </span>
                    {piece.variantTitle &&
                    !/^default title$/i.test(piece.variantTitle) ? (
                      <span className="mt-1 block text-sm text-primary">
                        {piece.variantTitle}
                      </span>
                    ) : null}
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-primary">
                      <Money data={piece.price} withoutTrailingZeros />
                      {canTryOn ? null : (
                        <span className="border border-line px-2 py-0.5 text-[10px] uppercase tracking-widest">
                          {t('fittingRoom.no3d')}
                        </span>
                      )}
                    </span>
                  </span>
                </label>
                <div className="mt-3 flex items-center gap-4 pl-8 text-[11px] uppercase tracking-widest text-primary">
                  <button
                    type="button"
                    aria-label={t('product.fittingRoomRemove', {title})}
                    disabled={movingId !== null}
                    onClick={() => onRemove(piece.variantId)}
                    className="underline underline-offset-4 transition-colors hover:text-bark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('common.remove')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('fittingRoom.moveLabel', {title})}
                    disabled={!piece.available || movingId !== null}
                    onClick={() => onMoveToCart(piece.variantId)}
                    className="underline underline-offset-4 transition-colors hover:text-bark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {moving
                      ? t('fittingRoom.moving')
                      : piece.available
                        ? t('fittingRoom.moveToCart')
                        : t('product.soldOut')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <aside
        aria-label={t('fittingRoom.tryOn')}
        className="flex min-h-[240px] flex-col border-t border-line pt-6 lg:sticky lg:top-24 lg:min-h-[420px] lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
      >
        <h2 className="font-display text-2xl text-ink">
          {t('fittingRoom.tryOnTitle')}
        </h2>

        <div className="mt-6">
          {selectedLook.length ? (
            <div className="w-full text-center">
              <div className="mx-auto flex max-w-xs flex-wrap justify-center gap-2">
                {selectedLook.map((piece) =>
                  piece.image ? (
                    <Image
                      key={piece.variantId}
                      alt={piece.image.altText || pieceTitle(piece)}
                      className="h-24 w-20 object-cover"
                      data={piece.image}
                      sizes="80px"
                      width={160}
                    />
                  ) : null,
                )}
              </div>
              <p className="mt-4 text-sm text-primary">
                {t('fittingRoom.readyToTry', {count: selectedLook.length})}
              </p>
              <div className="mx-auto mt-5 w-full max-w-xs">
                <FittingRoomLookTryOn
                  ids={selectedLook.map((piece) => piece.variantId)}
                  isMobile={isMobile}
                  pieces={selectedLook.flatMap((piece) =>
                    piece.tryOn ? [piece.tryOn] : [],
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-4 text-center">
              <Icon name="hanger" size={28} className="text-primary/40" />
              <p className="max-w-[30ch] text-sm text-primary">
                {t('fittingRoom.selectHint')}
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
