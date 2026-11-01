import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchProfile,
  postFavoriteOperation,
  ProfileRequestError,
} from './client';
import {isProductGid} from './schema';
import type {ProfileStatus} from './types';

type ProfileState = {
  status: ProfileStatus;
  isLoggedIn: boolean;
  favorites: string[];
  pendingWrites: number;
};

type ProfileContextValue = ProfileState & {
  syncing: boolean;
  hasFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

const INITIAL_STATE: ProfileState = {
  status: 'loading',
  isLoggedIn: false,
  favorites: [],
  pendingWrites: 0,
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<ProfileState>(INITIAL_STATE);
  const stateRef = useRef(state);

  const commit = useCallback((next: ProfileState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      commit({
        status: 'ready',
        isLoggedIn: profile.loggedIn,
        favorites: profile.favorites,
        pendingWrites: 0,
      });
    } catch {
      commit({
        status: 'ready',
        isLoggedIn: false,
        favorites: [],
        pendingWrites: 0,
      });
    }
  }, [commit]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const toggleFavorite = useCallback(
    (id: string) => {
      if (!isProductGid(id)) return;

      const current = stateRef.current;
      if (!current.isLoggedIn) return;

      const isFavorite = current.favorites.includes(id);
      const next = isFavorite
        ? current.favorites.filter((favoriteId) => favoriteId !== id)
        : [id, ...current.favorites.filter((favoriteId) => favoriteId !== id)];

      commit({
        ...current,
        favorites: next,
        pendingWrites: current.pendingWrites + 1,
      });

      void postFavoriteOperation(isFavorite ? {remove: [id]} : {add: [id]})
        .then(() => {
          const latest = stateRef.current;
          commit({
            ...latest,
            pendingWrites: Math.max(0, latest.pendingWrites - 1),
          });
        })
        .catch((error: unknown) => {
          if (error instanceof ProfileRequestError && error.status === 401) {
            void loadProfile();
            return;
          }

          const latest = stateRef.current;
          commit({
            ...latest,
            pendingWrites: Math.max(0, latest.pendingWrites - 1),
          });
          console.error('Could not save favorite', error);
        });
    },
    [commit, loadProfile],
  );

  const hasFavorite = useCallback(
    (id: string) => state.favorites.includes(id),
    [state.favorites],
  );

  const value = useMemo(
    () => ({
      ...state,
      syncing: state.pendingWrites > 0,
      hasFavorite,
      toggleFavorite,
    }),
    [state, hasFavorite, toggleFavorite],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }

  return context;
}
