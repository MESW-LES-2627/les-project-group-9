import {useEffect, useId, useRef, type ReactNode} from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);

  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancelRef.current();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-ink/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md bg-cream p-6 shadow-stack focus:outline-none"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2 className="font-display text-2xl text-ink" id={titleId}>
          {title}
        </h2>
        <div className="mt-3 text-sm leading-7 text-primary">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="min-h-10 border border-line px-4 text-xs uppercase tracking-widest text-primary hover:border-ink"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="min-h-10 bg-primary px-4 text-xs uppercase tracking-widest text-white hover:bg-ink"
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
