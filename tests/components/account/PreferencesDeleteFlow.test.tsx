import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {PreferencesData} from '~/components/account/PreferencesData';
import {PreferencesForm} from '~/components/account/PreferencesForm';
import {RingSizeForm} from '~/components/account/RingSizeForm';
import {AllergenBadge} from '~/components/product/AllergenBadge';
import {RingSizeHelp} from '~/components/product/RingSizeHelp';
import {ProfileProvider, useProfile} from '~/lib/profile/ProfileProvider';
import {
  hasRecommendationPreferences,
  normalizePreferences,
} from '~/lib/profile/preferences';
import type {PreferenceProfile} from '~/lib/profile/types';

const api = vi.hoisted(() => ({
  preferences: {} as PreferenceProfile,
  loggedIn: true,
  deleteStatus: 200,
  deletes: 0,
}));

function json(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response);
}

function ProfileState() {
  const {preferences, syncing, isLoggedIn} = useProfile();

  return (
    <output
      data-testid="profile-state"
      data-suggestions={String(hasRecommendationPreferences(preferences))}
      data-syncing={String(syncing)}
      data-logged-in={String(isLoggedIn)}
    />
  );
}

function renderFlow() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <PreferencesForm
          options={{
            colors: [],
            materials: [{value: 'gold-plated', label: 'Gold-plated'}],
          }}
        />
        <RingSizeForm />
        <PreferencesData />
        <AllergenBadge allergens={{value: '["Zinc"]'}} />
        <RingSizeHelp />
        <ProfileState />
      </ProfileProvider>
    </MemoryRouter>,
  );
}

async function confirmDelete() {
  const user = userEvent.setup();

  await user.click(
    await screen.findByRole('button', {name: 'Delete my preferences'}),
  );
  await user.click(screen.getByRole('button', {name: 'Confirm delete'}));

  return user;
}

beforeEach(() => {
  api.preferences = {
    allergies: ['zinc'],
    ringSizes: {'left-ring': '6'},
    preferredMaterials: ['gold-plated'],
  };
  api.loggedIn = true;
  api.deleteStatus = 200;
  api.deletes = 0;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/api/profile')) {
        return json({
          loggedIn: api.loggedIn,
          favorites: [],
          fittingRoom: [],
          preferences: api.loggedIn ? api.preferences : null,
        });
      }

      if (url.endsWith('/api/profile/preferences') && init?.method === 'DELETE') {
        api.deletes += 1;

        if (api.deleteStatus !== 200) {
          return json({error: 'failed'}, api.deleteStatus);
        }

        api.preferences = normalizePreferences(null);

        return json({preferences: api.preferences});
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deleting every preference', () => {
  it('clears the profile and the storefront effects', async () => {
    const user = userEvent.setup();
    renderFlow();

    const state = screen.getByTestId('profile-state');

    expect(await screen.findByLabelText('Zinc')).toBeChecked();
    expect(screen.getByLabelText('Gold-plated')).toBeChecked();
    expect(screen.getByText('Allergen')).toBeInTheDocument();
    expect(state).toHaveAttribute('data-suggestions', 'true');

    await confirmDelete();

    await waitFor(() => {
      expect(screen.queryByText('Allergen')).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText('Your preferences were deleted.'),
    ).toBeInTheDocument();
    expect(api.deletes).toBe(1);

    expect(screen.getByLabelText('Zinc')).not.toBeChecked();
    expect(screen.getByLabelText('Gold-plated')).not.toBeChecked();
    expect(state).toHaveAttribute('data-suggestions', 'false');
    expect(state).toHaveAttribute('data-syncing', 'false');

    await user.click(
      screen.getByRole('button', {name: 'Measurement Guide'}),
    );
    expect(
      await screen.findByText('You have not saved your ring sizes yet.'),
    ).toBeInTheDocument();
  });

  it('keeps the saved preferences when the delete fails', async () => {
    api.deleteStatus = 500;
    renderFlow();

    const state = screen.getByTestId('profile-state');

    expect(await screen.findByLabelText('Zinc')).toBeChecked();

    await confirmDelete();

    expect(
      await screen.findByText('Could not delete your preferences.'),
    ).toBeInTheDocument();
    expect(api.deletes).toBe(1);
    expect(screen.getByLabelText('Zinc')).toBeChecked();
    expect(screen.getByText('Allergen')).toBeInTheDocument();
    expect(state).toHaveAttribute('data-suggestions', 'true');
    expect(state).toHaveAttribute('data-syncing', 'false');
  });

  it('reloads the profile when the session has expired', async () => {
    api.deleteStatus = 401;
    renderFlow();

    const state = screen.getByTestId('profile-state');

    expect(await screen.findByLabelText('Zinc')).toBeChecked();

    // The server now treats the shopper as logged out.
    api.loggedIn = false;
    await confirmDelete();

    await waitFor(() => {
      expect(state).toHaveAttribute('data-logged-in', 'false');
    });
    expect(state).toHaveAttribute('data-syncing', 'false');
    expect(
      screen.queryByRole('button', {name: 'Delete my preferences'}),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Allergen')).not.toBeInTheDocument();
  });
});
