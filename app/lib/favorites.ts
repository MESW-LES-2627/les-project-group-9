import {useProfile} from './profile/ProfileProvider';

export function useFavorites() {
  const {
    favorites,
    hasFavorite,
    toggleFavorite,
    status,
    isLoggedIn,
    syncing,
  } = useProfile();

  return {
    ids: favorites,
    has: hasFavorite,
    toggle: toggleFavorite,
    ready: status === 'ready',
    isLoggedIn,
    syncing,
  };
}
