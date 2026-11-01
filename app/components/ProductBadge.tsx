type ProductBadgeProps = {
  value?: string | null;
};

export function ProductBadge({value}: ProductBadgeProps) {
  if (!value) {
    return null;
  }

  return (
    <span className="pointer-events-none absolute left-3 top-3 bg-paper/95 px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-primary">
      {value}
    </span>
  );
}
