export type ProfileStatus = 'loading' | 'ready' | 'error';

export type RingHand = 'left' | 'right';
export type RingFingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
export type RingFinger = `${RingHand}-${RingFingerName}`;

export type PreferenceProfile = {
  allergies?: string[];
  skin?: {
    tone?: string;
    undertone?: string;
  };
  ringSizes?: Partial<Record<RingFinger, string>>;
  preferredMaterials?: string[];
  preferredColors?: string[];
  preferredGemstones?: string[];
};

export type PreferenceOption = {
  value: string;
  label: string;
};

/** Options the profile form offers, derived from the current catalog. */
export type PreferenceOptions = {
  colors: PreferenceOption[];
  materials: PreferenceOption[];
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

export type CustomerProfile = {
  customerId: string | null;
  favorites: string[];
  fittingRoom: string[];
  preferences: PreferenceProfile;
};
