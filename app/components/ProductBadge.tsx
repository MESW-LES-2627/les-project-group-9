type ProductBadgeProps = {
  value?: string | null;
  tone?: 'default' | 'warning';
  className?: string;
};

const TONES = {
  default: 'bg-paper/95 text-primary',
  warning: 'bg-amber-200 text-ink',
} as const;

export function ProductBadge({
  value,
  tone = 'default',
  className = '',
}: ProductBadgeProps) {
  if (!value) {
    return null;
  }

  return (
    <span
      className={`pointer-events-none inline-block px-2.5 py-1.5 text-[10px] uppercase tracking-widest ${TONES[tone]} ${className}`}
    >
      {value}
    </span>
  );
}
