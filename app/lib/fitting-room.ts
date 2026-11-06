import {useProfile} from './profile/ProfileProvider';

export function useFittingRoom() {
  const {
    fittingRoom,
    hasFittingRoomItem,
    toggleFittingRoom,
    status,
    isLoggedIn,
    syncing,
  } = useProfile();

  return {
    ids: fittingRoom,
    has: hasFittingRoomItem,
    toggle: toggleFittingRoom,
    ready: status === 'ready',
    isLoggedIn,
    syncing,
  };
}
