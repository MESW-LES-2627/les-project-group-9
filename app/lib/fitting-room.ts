import {useProfile} from './profile/ProfileProvider';

export function useFittingRoom() {
  const {
    fittingRoom,
    hasFittingRoomItem,
    toggleFittingRoom,
    setFittingRoom,
    status,
    isLoggedIn,
    syncing,
  } = useProfile();

  return {
    ids: fittingRoom,
    has: hasFittingRoomItem,
    toggle: toggleFittingRoom,
    setIds: setFittingRoom,
    ready: status === 'ready',
    isLoggedIn,
    syncing,
  };
}
