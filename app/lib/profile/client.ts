import type {FavoriteOperation, ProfileResponse} from './types';

export class ProfileRequestError extends Error {
  status: number;

  constructor(status: number) {
    super(`Profile request failed (${status})`);
    this.name = 'ProfileRequestError';
    this.status = status;
  }
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ProfileRequestError(response.status);
  }

  return (await response.json()) as T;
}

export function fetchProfile(): Promise<ProfileResponse> {
  return request<ProfileResponse>('/api/profile', {
    cache: 'no-store',
    headers: {Accept: 'application/json'},
  });
}

export function postFavoriteOperation(
  operation: FavoriteOperation,
): Promise<{favorites: string[]}> {
  return request<{favorites: string[]}>('/api/profile/favorites', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(operation),
  });
}
