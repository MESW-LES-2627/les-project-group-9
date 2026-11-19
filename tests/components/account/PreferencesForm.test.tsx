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
      preferredColors: [],
      preferredMaterials: [],
    });
    expect(screen.getByText('Preferences saved.')).toBeInTheDocument();
  });

  it('saves selected colours and materials', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PreferencesFields
        preferences={{
          preferredColors: ['gold'],
          preferredMaterials: [],
          preferredGemstones: ['moonstone'],
          ringSizes: {'left-ring': '6'},
        }}
        options={{
          colors: [
            {value: 'gold', label: 'Gold'},
            {value: 'silver', label: 'Silver'},
          ],
          materials: [
            {value: 'gold-plated', label: 'Gold-plated'},
            {value: 'silver-plated', label: 'Silver-plated'},
          ],
        }}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByLabelText('Silver'));
    await user.click(screen.getByLabelText('Gold-plated'));
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: [],
      skin: {},
      preferredColors: ['gold', 'silver'],
      preferredMaterials: ['gold-plated'],
    });
  });

  it('replaces a saved allergen with the newly selected one', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PreferencesFields
        preferences={{allergies: ['nickel']}}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByLabelText('Nickel'));
    await user.click(screen.getByLabelText('Zinc'));
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: ['zinc'],
      skin: {},
      preferredColors: [],
      preferredMaterials: [],
    });
  });

  it('removes the last allergen when it is unchecked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PreferencesFields
        preferences={{allergies: ['nickel']}}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByLabelText('Nickel'));
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: [],
      skin: {},
      preferredColors: [],
      preferredMaterials: [],
    });
  });

  it('replaces a saved material with the newly selected one', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PreferencesFields
        preferences={{preferredMaterials: ['gold-plated']}}
        options={{
          colors: [],
          materials: [
            {value: 'gold-plated', label: 'Gold-plated'},
            {value: 'silver-plated', label: 'Silver-plated'},
          ],
        }}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByLabelText('Gold-plated'));
    await user.click(screen.getByLabelText('Silver-plated'));
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: [],
      skin: {},
      preferredColors: [],
      preferredMaterials: ['silver-plated'],
    });
  });

  it('replaces saved skin tone and undertone with new values', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PreferencesFields
        preferences={{skin: {tone: 'medium', undertone: 'warm'}}}
        onSave={onSave}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Skin tone'), 'deep');
    await user.selectOptions(screen.getByLabelText('Undertone'), 'cool');
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: [],
      skin: {tone: 'deep', undertone: 'cool'},
      preferredColors: [],
      preferredMaterials: [],
    });
  });

  it('clears skin tone and undertone when both are set back to Not set', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PreferencesFields
        preferences={{skin: {tone: 'medium', undertone: 'warm'}}}
        onSave={onSave}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Skin tone'), '');
    await user.selectOptions(screen.getByLabelText('Undertone'), '');
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: [],
      skin: {},
      preferredColors: [],
      preferredMaterials: [],
    });
  });

  it('replaces a saved colour with the newly selected one', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PreferencesFields
        preferences={{preferredColors: ['gold']}}
        options={{
          colors: [
            {value: 'gold', label: 'Gold'},
            {value: 'silver', label: 'Silver'},
          ],
          materials: [],
        }}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByLabelText('Gold'));
    await user.click(screen.getByLabelText('Silver'));
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: [],
      skin: {},
      preferredColors: ['silver'],
      preferredMaterials: [],
    });
  });

  it('removes a colour when it is unchecked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PreferencesFields
        preferences={{preferredColors: ['gold']}}
        options={{colors: [{value: 'gold', label: 'Gold'}], materials: []}}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByLabelText('Gold'));
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: [],
      skin: {},
      preferredColors: [],
      preferredMaterials: [],
    });
  });

  it('hides an option group when the catalog has no values for it', () => {
    render(
      <PreferencesFields
        preferences={null}
        options={{colors: [], materials: []}}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByText('Preferred colours')).not.toBeInTheDocument();
    expect(screen.queryByText('Preferred materials')).not.toBeInTheDocument();
  });

  it('keeps saved values when the catalog has no options to show', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PreferencesFields
        preferences={{
          preferredColors: ['gold'],
          preferredMaterials: ['gold-plated'],
        }}
        options={{colors: [], materials: []}}
        onSave={onSave}
      />,
    );

    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: [],
      skin: {},
      preferredColors: ['gold'],
      preferredMaterials: ['gold-plated'],
    });
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
