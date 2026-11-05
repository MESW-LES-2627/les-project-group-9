export type ProfileStatus = 'loading' | 'ready' | 'error';

export type PreferenceProfile = {
  allergies?: string[];
  skin?: {
    tone?: string;
    undertone?: string;
  };
  ringSizes?: Record<string, string>;
  preferredMaterials?: string[];
  preferredColors?: string[];
  preferredGemstones?: string[];
};

export type ProfileResponse = {
  loggedIn: boolean;
  favorites: string[];
  fittingRoom: string[];
  preferences: PreferenceProfile | null;
};

export type ListOperation = {
  add?: string[];
  remove?: string[];
};

export type FavoriteOperation = ListOperation;
