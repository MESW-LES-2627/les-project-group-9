import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ProfileProvider} from '~/lib/profile/ProfileProvider';
import {useFittingRoom} from '~/lib/fitting-room';
import {useFavorites} from '~/lib/favorites';

const VARIANT = 'gid://shopify/ProductVariant/1';
const PRODUCT = 'gid://shopify/Product/1';

function Harness() {
  const fittingRoom = useFittingRoom();
  const favorites = useFavorites();

  return (
    <>
      <span>{fittingRoom.ready ? 'ready' : 'loading'}</span>
      <button
        onClick={() => fittingRoom.toggle(VARIANT)}
        type="button"
      >
        {fittingRoom.has(VARIANT) ? 'variant in room' : 'variant not in room'}
      </button>
      <button onClick={() => fittingRoom.toggle(PRODUCT)} type="button">
        toggle product in room
      </button>
      <button onClick={() => favorites.toggle(PRODUCT)} type="button">
        {favorites.has(PRODUCT) ? 'favorite on' : 'favorite off'}
      </button>
    </>
  );
}

const jsonResponse = (body: unknown) =>
  ({ok: true, json: async () => body}) as Response;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/profile/fitting-room') {
      return jsonResponse({fittingRoom: [VARIANT]});
    }
    if (url === '/api/profile/favorites') {
      return jsonResponse({favorites: [PRODUCT]});
    }

    return jsonResponse({
      loggedIn: true,
      favorites: [],
      fittingRoom: [],
      preferences: null,
    });
  });

  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderProfile() {
  render(
    <ProfileProvider>
      <Harness />
    </ProfileProvider>,
  );

  await screen.findByText('ready');
}

function postedBody(url: string) {
  return fetchMock.mock.calls
    .filter(([called]) => called === url)
    .map(([, init]) => JSON.parse(String(init?.body)))[0];
}

describe('ProfileProvider lists', () => {
  it('adds a variant GID to the fitting room', async () => {
    const user = userEvent.setup();
    await renderProfile();

    await user.click(
      screen.getByRole('button', {name: 'variant not in room'}),
    );

    expect(
      await screen.findByRole('button', {name: 'variant in room'}),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(postedBody('/api/profile/fitting-room')).toEqual({
        add: [VARIANT],
      }),
    );
  });

  it('ignores product GIDs in the fitting room', async () => {
    const user = userEvent.setup();
    await renderProfile();

    await user.click(
      screen.getByRole('button', {name: 'toggle product in room'}),
    );

    expect(postedBody('/api/profile/fitting-room')).toBeUndefined();
  });

  it('keeps adding product GIDs to favorites', async () => {
    const user = userEvent.setup();
    await renderProfile();

    await user.click(screen.getByRole('button', {name: 'favorite off'}));

    expect(
      await screen.findByRole('button', {name: 'favorite on'}),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(postedBody('/api/profile/favorites')).toEqual({add: [PRODUCT]}),
    );
  });
});
