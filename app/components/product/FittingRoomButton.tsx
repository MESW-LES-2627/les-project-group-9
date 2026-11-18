import {Icon} from '~/components/shared/Icon';
import {useFittingRoom} from '~/lib/fitting-room';
import {useTranslation} from '~/lib/i18n';
import {ProductActionButton} from './ProductActionButton';

export function FittingRoomButton({
  productId,
  title,
  canTryOn = true,
  className = '',
}: {
  productId: string;
  title: string;
  /** Only pieces with a try-on overlay belong in the fitting room. */
  canTryOn?: boolean;
  className?: string;
}) {
  const {has, toggle, isLoggedIn} = useFittingRoom();
  const active = has(productId);
  const t = useTranslation();

  if (!canTryOn) return null;

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
