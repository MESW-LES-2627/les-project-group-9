import type {ReactNode} from 'react';

type ProductActionButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
};

/**
 * Shared round action button used next to the product title (favorite, fitting
 * room). The selected state is a full ink pill with paper-coloured icon, so a
 * stroke icon (the hanger) communicates "on" as clearly as the filled heart.
 */
export function ProductActionButton({
  active,
  label,
  onClick,
  className = '',
  children,
}: ProductActionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      data-active={active}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        active
          ? 'bg-ink text-paper hover:bg-bark'
          : 'bg-paper/90 text-primary hover:bg-white'
      } ${className}`}
    >
      {children}
    </button>
  );
}
