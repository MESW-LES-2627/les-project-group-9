import {Icon} from '~/components/shared/Icon';
import {useFittingRoom} from '~/lib/fitting-room';
import {useTranslation} from '~/lib/i18n';
import {ProductActionButton} from './ProductActionButton';

export function FittingRoomButton({
  productId,
  title,
  className = '',
}: {
  productId: string;
  title: string;
  className?: string;
}) {
  const {has, toggle, isLoggedIn} = useFittingRoom();
  const active = has(productId);
  const t = useTranslation();

  return (
    <ProductActionButton
      active={active}
      className={className}
      label={
        isLoggedIn
          ? active
            ? t('product.fittingRoomRemove', {title})
            : t('product.fittingRoomAdd', {title})
          : t('product.fittingRoomLogin', {title})
      }
      onClick={() => {
        if (!isLoggedIn) {
          window.location.assign('/account/login');
          return;
        }

        toggle(productId);
      }}
    >
      <Icon name="hanger" size={18} />
    </ProductActionButton>
  );
}
