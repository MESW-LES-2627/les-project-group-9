import {Icon} from '~/components/shared/Icon';
import {useFavorites} from '~/lib/favorites';
import {ProductActionButton} from './ProductActionButton';

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
    <ProductActionButton
      active={active}
      className={className}
      label={
        isLoggedIn
          ? active
            ? `Remove ${title} from favorites`
            : `Add ${title} to favorites`
          : `Log in to save ${title} to favorites`
      }
      onClick={() => {
        if (!isLoggedIn) {
          window.location.assign('/account/login');
          return;
        }

        toggle(productId);
      }}
    >
      <Icon filled={active} name="heart" size={18} />
    </ProductActionButton>
  );
}
