import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {PreferencesData} from '~/components/account/PreferencesData';
import {PreferencesForm} from '~/components/account/PreferencesForm';
import {RingSizeForm} from '~/components/account/RingSizeForm';
import {AllergenBadge} from '~/components/product/AllergenBadge';
import {RingSizeHelp} from '~/components/product/RingSizeHelp';
import {ProfileProvider} from '~/lib/profile/ProfileProvider';
import type {PreferenceProfile} from '~/lib/profile/types';

const api = vi.hoisted(() => ({
  preferences: {} as PreferenceProfile,
}));

function json(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

function renderFlow() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <PreferencesForm options={{colors: [], materials: []}} />
        <RingSizeForm />
        <PreferencesData />
        <AllergenBadge allergens={{value: '["Zinc"]'}} />
        <RingSizeHelp />
      </ProfileProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  api.preferences = {
    allergies: ['zinc'],
    ringSizes: {'left-ring': '6'},
    preferredMaterials: ['gold-plated'],
  };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/api/profile')) {
        return json({
          loggedIn: true,
          favorites: [],
          fittingRoom: [],
          preferences: api.preferences,
        });
      }

      if (url.endsWith('/api/profile/preferences') && init?.method === 'DELETE') {
        api.preferences = {allergies: [], skin: {}};

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

    expect(await screen.findByLabelText('Zinc')).toBeChecked();
    expect(screen.getByText('Allergen')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {name: 'Delete my preferences'}),
    );
    await user.click(screen.getByRole('button', {name: 'Confirm delete'}));

    await waitFor(() => {
      expect(screen.queryByText('Allergen')).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText('Your preferences were deleted.'),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Zinc')).not.toBeChecked();

    await user.click(
      screen.getByRole('button', {name: 'Measurement Guide'}),
    );
    expect(
      await screen.findByText('You have not saved your ring sizes yet.'),
    ).toBeInTheDocument();
  });
});
