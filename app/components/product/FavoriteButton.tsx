import {Icon} from '~/components/shared/Icon';
import {useFavorites} from '~/lib/favorites';
import {useTranslation} from '~/lib/i18n';
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
  const t = useTranslation();

  return (
    <ProductActionButton
      active={active}
      className={className}
      label={
        isLoggedIn
          ? active
            ? t('product.favoriteRemove', {title})
            : t('product.favoriteAdd', {title})
          : t('product.favoriteLogin', {title})
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
