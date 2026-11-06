import type {ReactNode} from 'react';

type ProductActionButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
};

/** Shared round action button used next to the product title. */
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
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full bg-paper/90 text-primary transition-colors hover:bg-white ${className}`}
    >
      {children}
    </button>
  );
}
