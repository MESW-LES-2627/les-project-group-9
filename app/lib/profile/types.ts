export type ProfileStatus = 'loading' | 'ready';

export type ProfileResponse = {
  loggedIn: boolean;
  favorites: string[];
};

export type FavoriteOperation = {
  add?: string[];
  remove?: string[];
};
