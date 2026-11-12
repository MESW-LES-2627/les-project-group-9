import type {PreferenceProfile} from '~/lib/profile/types';
import {signalsFromFavorites, signalsFromPreferences} from './signals';
import type {PreferenceSignal, ProductTraits} from './types';

export interface SignalSource {
  collect(): PreferenceSignal[];
}

export class FavoritesSignalSource implements SignalSource {
  readonly #favorites: ProductTraits[];

  constructor(favorites: ProductTraits[]) {
    this.#favorites = favorites;
  }

  collect(): PreferenceSignal[] {
    return signalsFromFavorites(this.#favorites);
  }
}

export class PreferencesSignalSource implements SignalSource {
  readonly #preferences: PreferenceProfile | null | undefined;

  constructor(preferences: PreferenceProfile | null | undefined) {
    this.#preferences = preferences;
  }

  collect(): PreferenceSignal[] {
    return signalsFromPreferences(this.#preferences);
  }
}
