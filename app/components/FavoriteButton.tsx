import {useFavorites} from '~/lib/favorites';

export function FavoriteButton({
                                 productId,
                                 title,
                                 className = '',
                               }: {
  productId: string;
  title: string;
  className?: string;
}) {
  const {has, toggle} = useFavorites();
  const active = has(productId);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(productId);
      }}
      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full bg-paper/90 text-primary transition-colors hover:bg-white ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.8 5 6.2 5c2 0 3.5 1.1 4.3 2.4h3C14.3 6.1 15.8 5 17.8 5c3.4 0 5.3 3.4 3.8 6.8C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}