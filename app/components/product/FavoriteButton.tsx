import {Icon} from '~/components/shared/Icon';
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
  const {has, toggle, isLoggedIn} = useFavorites();
  const active = has(productId);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={
        isLoggedIn
          ? active
            ? `Remove ${title} from favorites`
            : `Add ${title} to favorites`
          : `Log in to save ${title} to favorites`
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!isLoggedIn) {
          window.location.assign('/account/login');
          return;
        }

        toggle(productId);
      }}
      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full bg-paper/90 text-primary transition-colors hover:bg-white ${className}`}
    >
      <Icon filled={active} name="heart" size={18} />
    </button>
  );
}
