import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const profile = vi.hoisted(() => ({useProfile: vi.fn()}));

vi.mock('~/lib/profile/ProfileProvider', () => ({
  useProfile: profile.useProfile,
}));

import {PreferencesData} from '~/components/account/PreferencesData';

const clearPreferences = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  profile.useProfile.mockReturnValue({
    status: 'ready',
    clearPreferences,
  });
});

describe('PreferencesData', () => {
  it('offers the preferences download', () => {
    render(<PreferencesData />);

    expect(
      screen.getByRole('link', {name: 'Download my preferences'}),
    ).toHaveAttribute('href', '/api/profile/preferences/export');
  });

  it('asks for confirmation before deleting', async () => {
    const user = userEvent.setup();
    render(<PreferencesData />);

    await user.click(
      screen.getByRole('button', {name: 'Delete my preferences'}),
    );

    expect(clearPreferences).not.toHaveBeenCalled();
    expect(
      screen.getByText('This removes your saved preferences. Continue?'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(
      screen.queryByRole('button', {name: 'Confirm delete'}),
    ).not.toBeInTheDocument();
    expect(clearPreferences).not.toHaveBeenCalled();
  });

  it('deletes the preferences and confirms it', async () => {
    const user = userEvent.setup();
    clearPreferences.mockResolvedValue(undefined);
    render(<PreferencesData />);

    await user.click(
      screen.getByRole('button', {name: 'Delete my preferences'}),
    );
    await user.click(screen.getByRole('button', {name: 'Confirm delete'}));

    await waitFor(() => {
      expect(
        screen.getByText('Your preferences were deleted.'),
      ).toBeInTheDocument();
    });
    expect(clearPreferences).toHaveBeenCalledTimes(1);
  });

  it('shows an error when deletion fails', async () => {
    const user = userEvent.setup();
    clearPreferences.mockRejectedValue(new Error('down'));
    render(<PreferencesData />);

    await user.click(
      screen.getByRole('button', {name: 'Delete my preferences'}),
    );
    await user.click(screen.getByRole('button', {name: 'Confirm delete'}));

    expect(
      await screen.findByText('Could not delete your preferences.'),
    ).toBeInTheDocument();
  });

  it('renders nothing until the profile is ready', () => {
    profile.useProfile.mockReturnValue({
      status: 'loading',
      clearPreferences,
    });

    const {container} = render(<PreferencesData />);

    expect(container).toBeEmptyDOMElement();
  });
});
