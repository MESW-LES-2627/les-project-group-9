import {Icon} from '~/components/shared/Icon';
import {useFittingRoom} from '~/lib/fitting-room';
import {useTranslation} from '~/lib/i18n';
import {ProductActionButton} from './ProductActionButton';

export function FittingRoomButton({
  variantId,
  title,
  canTryOn = true,
  className = '',
}: {
  variantId: string;
  title: string;
  /** Only variants with a try-on overlay belong in the fitting room. */
  canTryOn?: boolean;
  className?: string;
}) {
  const {has, toggle, isLoggedIn} = useFittingRoom();
  const active = has(variantId);
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

        toggle(variantId);
      }}
    >
      <Icon name="hanger" size={18} />
    </ProductActionButton>
  );
}
