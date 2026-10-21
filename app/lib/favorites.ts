import {useSyncExternalStore} from 'react';

const KEY = 'jeweliette:favorites';
const EMPTY: string[] = [];

let cache: string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  cache = read();
  window.addEventListener('storage', () => {
    cache = read();
    emit();
  });
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  load();
  return cache;
}

export function toggleFavorite(id: string) {
  load();
  cache = cache.includes(id) ? cache.filter((x) => x !== id) : [...cache, id];
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable: keep in-memory state */
  }
  emit();
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return {ids, has: (id: string) => ids.includes(id), toggle: toggleFavorite};
}