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
  deletePreferences,
  fetchProfile,
  postFavoriteOperation,
  postFittingRoomOperation,
  postPreferences,
  ProfileRequestError,
} from './client';
import {isProductGid} from './schema';
import {isVariantGid} from './list-schema';
import type {
  ListOperation,
  PreferenceProfile,
  ProfileStatus,
} from './types';

type ProfileState = {
  status: ProfileStatus;
  isLoggedIn: boolean;
  favorites: string[];
  fittingRoom: string[];
  preferences: PreferenceProfile | null;
  pendingWrites: number;
};

type ProfileContextValue = ProfileState & {
  syncing: boolean;
  preferencesVersion: number;
  hasFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  hasFittingRoomItem: (id: string) => boolean;
  toggleFittingRoom: (id: string) => void;
  setFittingRoom: (ids: string[]) => void;
  savePreferences: (preferences: PreferenceProfile) => Promise<void>;
  clearPreferences: () => Promise<void>;
};

type ListKey = 'favorites' | 'fittingRoom';

/**
 * Which GID each list stores: favorites are products, the fitting room holds
 * variants (one entry per colourway).
 */
const LIST_VALIDATORS: Record<ListKey, (value: unknown) => value is string> = {
  favorites: isProductGid,
  fittingRoom: isVariantGid,
};

const INITIAL_STATE: ProfileState = {
  status: 'loading',
  isLoggedIn: false,
  favorites: [],
  fittingRoom: [],
  preferences: null,
  pendingWrites: 0,
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function withList(
  state: ProfileState,
  key: ListKey,
  list: string[],
): ProfileState {
  return key === 'favorites'
    ? {...state, favorites: list}
    : {...state, fittingRoom: list};
}

export function ProfileProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<ProfileState>(INITIAL_STATE);
  const [preferencesVersion, setPreferencesVersion] = useState(0);
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
        fittingRoom: profile.fittingRoom,
        preferences: profile.preferences,
        pendingWrites: 0,
      });
    } catch {
      commit({
        status: 'error',
        isLoggedIn: false,
        favorites: [],
        fittingRoom: [],
        preferences: null,
        pendingWrites: 0,
      });
    }
  }, [commit]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const toggleList = useCallback(
    (
      key: ListKey,
      id: string,
      post: (operation: ListOperation) => Promise<unknown>,
    ) => {
      if (!LIST_VALIDATORS[key](id)) return;

      const current = stateRef.current;
      if (!current.isLoggedIn) return;

      const list = current[key];
      const isActive = list.includes(id);
      const next = isActive
        ? list.filter((item) => item !== id)
        : [id, ...list.filter((item) => item !== id)];

      commit({
        ...withList(current, key, next),
        pendingWrites: current.pendingWrites + 1,
      });

      void post(isActive ? {remove: [id]} : {add: [id]})
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
          console.error(`Could not save ${key}`, error);
        });
    },
    [commit, loadProfile],
  );

  const toggleFavorite = useCallback(
    (id: string) => toggleList('favorites', id, postFavoriteOperation),
    [toggleList],
  );

  const toggleFittingRoom = useCallback(
    (id: string) => toggleList('fittingRoom', id, postFittingRoomOperation),
    [toggleList],
  );

  const setFittingRoom = useCallback(
    (ids: string[]) => {
      const current = stateRef.current;
      commit({...current, fittingRoom: ids});
    },
    [commit],
  );

  const savePreferences = useCallback(
    async (preferences: PreferenceProfile) => {
      const current = stateRef.current;
      if (!current.isLoggedIn) return;

      commit({
        ...current,
        pendingWrites: current.pendingWrites + 1,
      });

      try {
        const saved = await postPreferences(preferences);
        const latest = stateRef.current;
        commit({
          ...latest,
          preferences: saved.preferences,
          pendingWrites: Math.max(0, latest.pendingWrites - 1),
        });
      } catch (error) {
        if (error instanceof ProfileRequestError && error.status === 401) {
          await loadProfile();
        } else {
          const latest = stateRef.current;
          commit({
            ...latest,
            pendingWrites: Math.max(0, latest.pendingWrites - 1),
          });
        }

        throw error;
      }
    },
    [commit, loadProfile],
  );

  const clearPreferences = useCallback(async () => {
    const current = stateRef.current;
    if (!current.isLoggedIn) return;

    commit({
      ...current,
      pendingWrites: current.pendingWrites + 1,
    });

    try {
      const cleared = await deletePreferences();
      const latest = stateRef.current;
      commit({
        ...latest,
        preferences: cleared.preferences,
        pendingWrites: Math.max(0, latest.pendingWrites - 1),
      });
      setPreferencesVersion((version) => version + 1);
    } catch (error) {
      if (error instanceof ProfileRequestError && error.status === 401) {
        await loadProfile();
      } else {
        const latest = stateRef.current;
        commit({
          ...latest,
          pendingWrites: Math.max(0, latest.pendingWrites - 1),
        });
      }

      throw error;
    }
  }, [commit, loadProfile]);

  const hasFavorite = useCallback(
    (id: string) => state.favorites.includes(id),
    [state.favorites],
  );

  const hasFittingRoomItem = useCallback(
    (id: string) => state.fittingRoom.includes(id),
    [state.fittingRoom],
  );

  const value = useMemo(
    () => ({
      ...state,
      syncing: state.pendingWrites > 0,
      preferencesVersion,
      hasFavorite,
      toggleFavorite,
      hasFittingRoomItem,
      toggleFittingRoom,
      setFittingRoom,
      savePreferences,
      clearPreferences,
    }),
    [
      state,
      preferencesVersion,
      hasFavorite,
      toggleFavorite,
      hasFittingRoomItem,
      toggleFittingRoom,
      setFittingRoom,
      savePreferences,
      clearPreferences,
    ],
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
