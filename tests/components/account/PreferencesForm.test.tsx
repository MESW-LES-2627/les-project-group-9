import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';

const profile = vi.hoisted(() => ({useProfile: vi.fn()}));

vi.mock('~/lib/profile/ProfileProvider', () => ({
  useProfile: profile.useProfile,
}));

import {
  PreferencesFields,
  PreferencesForm,
} from '~/components/account/PreferencesForm';

describe('PreferencesFields', () => {
  it('saves selected allergies and skin values', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PreferencesFields
        preferences={{
          allergies: ['nickel'],
          skin: {tone: 'medium', undertone: 'warm'},
        }}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByLabelText('Zinc'));
    await user.selectOptions(screen.getByLabelText('Undertone'), 'cool');
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: ['nickel', 'zinc'],
      skin: {tone: 'medium', undertone: 'cool'},
    });
    expect(screen.getByText('Preferences saved.')).toBeInTheDocument();
  });
});

describe('PreferencesForm', () => {
  it('does not render the form when the profile fails to load', () => {
    profile.useProfile.mockReturnValue({
      status: 'error',
      preferences: null,
      savePreferences: vi.fn(),
    });

    render(<PreferencesForm />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load preferences. Refresh the page to try again.',
    );
    expect(
      screen.queryByRole('button', {name: 'Save preferences'}),
    ).not.toBeInTheDocument();
  });
});
