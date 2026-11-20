import type {
  ListOperation,
  PreferenceProfile,
  ProfileResponse,
} from './types';

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

function postListOperation<T>(
  url: string,
  operation: ListOperation,
): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(operation),
  });
}

export function postFavoriteOperation(
  operation: ListOperation,
): Promise<{favorites: string[]}> {
  return postListOperation<{favorites: string[]}>(
    '/api/profile/favorites',
    operation,
  );
}

export function postFittingRoomOperation(
  operation: ListOperation,
): Promise<{fittingRoom: string[]}> {
  return postListOperation<{fittingRoom: string[]}>(
    '/api/profile/fitting-room',
    operation,
  );
}

export function postPreferences(
  preferences: PreferenceProfile,
): Promise<{preferences: PreferenceProfile}> {
  return request<{preferences: PreferenceProfile}>(
    '/api/profile/preferences',
    {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    },
  );
}

export function deletePreferences(): Promise<{
  preferences: PreferenceProfile;
}> {
  return request<{preferences: PreferenceProfile}>(
    '/api/profile/preferences',
    {
      method: 'DELETE',
      cache: 'no-store',
      headers: {Accept: 'application/json'},
    },
  );
}
