import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {PreferencesForm} from '~/components/account/PreferencesForm';
import {RingSizeForm} from '~/components/account/RingSizeForm';
import {AllergenBadge} from '~/components/product/AllergenBadge';
import {RingSizeHelp} from '~/components/product/RingSizeHelp';
import {ProfileProvider} from '~/lib/profile/ProfileProvider';
import {
  normalizePreferencesPatch,
  preferencesField,
} from '~/lib/profile/preferences';
import type {PreferenceProfile} from '~/lib/profile/types';

const api = vi.hoisted(() => ({
  preferences: {} as PreferenceProfile,
  posts: [] as Array<Partial<PreferenceProfile>>,
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
        <PreferencesForm
          options={{
            colors: [],
            materials: [{value: 'gold-plated', label: 'Gold-plated'}],
          }}
        />
        <RingSizeForm />
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
  api.posts = [];

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

      if (url.endsWith('/api/profile/preferences')) {
        // Mirror the route: normalize the patch, then merge it into the
        // stored preferences with the same field the server uses.
        const patch = normalizePreferencesPatch(
          JSON.parse(String(init?.body ?? '{}')),
        );
        api.posts.push(patch);
        api.preferences = preferencesField.parse(
          preferencesField.nextValue(
            {
              customerId: 'gid://shopify/Customer/1',
              favorites: [],
              fittingRoom: [],
              preferences: api.preferences,
            },
            patch,
          ),
        );

        return json({preferences: api.preferences});
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('preferences flow', () => {
  it('stops using an allergy once it is deleted', async () => {
    const user = userEvent.setup();
    renderFlow();

    expect(await screen.findByLabelText('Zinc')).toBeChecked();
    expect(screen.getByText('Allergen')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Zinc'));
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    await waitFor(() => {
      expect(screen.queryByText('Allergen')).not.toBeInTheDocument();
    });
    expect(api.posts[0]).toMatchObject({allergies: []});
    expect(screen.getByText('Preferences saved.')).toBeInTheDocument();
  });

  it('stops using a ring size once it is deleted', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(
      await screen.findByRole('button', {name: 'Measurement Guide'}),
    );
    expect(await screen.findByText('Ring: 6')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.selectOptions(
      document.querySelector('#ring-size-left-ring') as HTMLElement,
      '',
    );
    await user.click(screen.getByRole('button', {name: 'Save ring sizes'}));

    await waitFor(() => {
      expect(api.posts[0]).toEqual({ringSizes: {}});
    });

    await user.click(
      screen.getByRole('button', {name: 'Measurement Guide'}),
    );
    expect(
      await screen.findByText('You have not saved your ring sizes yet.'),
    ).toBeInTheDocument();
  });

  it('stops using a material once it is deleted', async () => {
    const user = userEvent.setup();
    renderFlow();

    await screen.findByLabelText('Gold-plated');
    await user.click(screen.getByLabelText('Gold-plated'));
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    await waitFor(() => {
      expect(api.posts[0]).toMatchObject({preferredMaterials: []});
    });
    expect(api.preferences.preferredMaterials).toEqual([]);
  });
});
