import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const profile = vi.hoisted(() => ({useProfile: vi.fn()}));

vi.mock('~/lib/profile/ProfileProvider', () => ({
  useProfile: profile.useProfile,
}));

import {RingSizeHelp} from '../../../app/components/product/RingSizeHelp';

function renderHelp() {
  return render(
    <MemoryRouter>
      <RingSizeHelp />
    </MemoryRouter>,
  );
}

function loggedIn(ringSizes?: Record<string, string>) {
  profile.useProfile.mockReturnValue({
    status: 'ready',
    isLoggedIn: true,
    preferences: ringSizes ? {allergies: [], skin: {}, ringSizes} : null,
  });
}

describe('RingSizeHelp', () => {
  beforeEach(() => {
    profile.useProfile.mockReset();
  });

  it('renders nothing for guests', () => {
    profile.useProfile.mockReturnValue({
      status: 'ready',
      isLoggedIn: false,
      preferences: null,
    });

    const {container} = renderHelp();

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the profile is loading', () => {
    profile.useProfile.mockReturnValue({
      status: 'loading',
      isLoggedIn: false,
      preferences: null,
    });

    const {container} = renderHelp();

    expect(container).toBeEmptyDOMElement();
  });

  it('opens and closes the dialog with the close button', async () => {
    const user = userEvent.setup();
    loggedIn({'left-ring': '6'});
    renderHelp();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Measurement Guide'}));
    expect(screen.getByRole('dialog', {name: 'Your ring sizes'})).toBeVisible();

    await user.click(screen.getByRole('button', {name: 'Close'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    loggedIn({'left-ring': '6'});
    renderHelp();

    const trigger = screen.getByRole('button', {name: 'Measurement Guide'});
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('lists the saved sizes grouped by hand', async () => {
    const user = userEvent.setup();
    loggedIn({'left-ring': '6', 'right-pinky': '6.5'});
    renderHelp();

    await user.click(screen.getByRole('button', {name: 'Measurement Guide'}));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Left hand');
    expect(dialog).toHaveTextContent('Ring: 6');
    expect(dialog).toHaveTextContent('Right hand');
    expect(dialog).toHaveTextContent('Pinky: 6.5');
    expect(dialog).not.toHaveTextContent('not saved');
  });

  it('shows a prompt and a link to the profile when no sizes are saved', async () => {
    const user = userEvent.setup();
    loggedIn();
    renderHelp();

    await user.click(screen.getByRole('button', {name: 'Measurement Guide'}));

    expect(
      screen.getByText('You have not saved your ring sizes yet.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {name: 'Add my ring sizes'}),
    ).toHaveAttribute('href', '/account/profile');
  });
});
