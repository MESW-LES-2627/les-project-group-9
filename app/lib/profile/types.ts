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

export type ProfileResponse = {
  loggedIn: boolean;
  favorites: string[];
  preferences: PreferenceProfile | null;
};

export type FavoriteOperation = {
  add?: string[];
  remove?: string[];
};
