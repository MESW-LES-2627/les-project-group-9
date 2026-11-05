import {Icon} from '~/components/shared/Icon';
import {useFittingRoom} from '~/lib/fitting-room';
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

  return (
    <ProductActionButton
      active={active}
      className={className}
      label={
        isLoggedIn
          ? active
            ? `Remove ${title} from fitting room`
            : `Add ${title} to fitting room`
          : `Log in to add ${title} to fitting room`
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
