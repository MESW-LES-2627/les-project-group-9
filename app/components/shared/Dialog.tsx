import {createPortal} from 'react-dom';
import {useEffect, useId, useRef, type ReactNode} from 'react';
import {useTranslation} from '~/lib/i18n';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons rendered in a row at the bottom of the panel. */
  footer?: ReactNode;
  /** Extra classes for the panel (width, padding). */
  className?: string;
  /** Classes for the content wrapper; empty for full-bleed content. */
  bodyClassName?: string;
};

/**
 * Accessible modal shell: portal, focus trap, Escape to close, body scroll lock
 * and focus restoration. Use it through `ConfirmDialog` or the try-on dialogs.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  className = 'max-w-md p-6',
  bodyClassName = 'mt-3 text-sm leading-7 text-primary',
}: DialogProps) {
  const t = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    dialog?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const nodes = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [];
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      const active = document.activeElement;

      if (!dialog?.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto p-4">
      <button
        aria-label={t('common.closeDialog')}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/40"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={`relative w-full bg-cream shadow-stack focus:outline-none ${className}`}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2 className="font-display text-2xl text-ink" id={titleId}>
          {title}
        </h2>
        <div className={bodyClassName}>{children}</div>
        {footer ? (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** Shared secondary/primary button classes for dialog footers. */
export const dialogButton = {
  secondary:
    'min-h-[44px] border border-line px-4 text-xs uppercase tracking-widest text-primary hover:border-bark',
  primary:
    'min-h-[44px] bg-primary px-4 text-xs uppercase tracking-widest text-white hover:bg-bark',
} as const;
