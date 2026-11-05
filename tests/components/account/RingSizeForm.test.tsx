import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';

const profile = vi.hoisted(() => ({useProfile: vi.fn()}));

vi.mock('~/lib/profile/ProfileProvider', () => ({
  useProfile: profile.useProfile,
}));

import {
  RingSizeFields,
  RingSizeForm,
} from '../../../app/components/account/RingSizeForm';

describe('RingSizeFields', () => {
  it('renders one select per finger, grouped by hand', () => {
    render(<RingSizeFields ringSizes={{}} onSave={vi.fn()} />);

    expect(screen.getByRole('group', {name: 'Left hand'})).toBeInTheDocument();
    expect(screen.getByRole('group', {name: 'Right hand'})).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(10);
    expect(screen.getByLabelText('Thumb', {selector: '#ring-size-left-thumb'}))
      .toHaveValue('');
  });

  it('saves only the fingers that have a size', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <RingSizeFields ringSizes={{'left-ring': '6'}} onSave={onSave} />,
    );

    await user.selectOptions(
      document.querySelector('#ring-size-right-pinky') as HTMLElement,
      '6.5',
    );
    await user.click(screen.getByRole('button', {name: 'Save ring sizes'}));

    expect(onSave).toHaveBeenCalledWith({
      'left-ring': '6',
      'right-pinky': '6.5',
    });
    expect(screen.getByText('Ring sizes saved.')).toBeInTheDocument();
  });

  it('removes a finger when it is set back to Not set', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <RingSizeFields ringSizes={{'left-ring': '6'}} onSave={onSave} />,
    );

    await user.selectOptions(
      document.querySelector('#ring-size-left-ring') as HTMLElement,
      '',
    );
    await user.click(screen.getByRole('button', {name: 'Save ring sizes'}));

    expect(onSave).toHaveBeenCalledWith({});
  });

  it('shows an error when saving fails', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('down'));

    render(<RingSizeFields ringSizes={{}} onSave={onSave} />);

    await user.click(screen.getByRole('button', {name: 'Save ring sizes'}));

    expect(
      await screen.findByText('Could not save ring sizes.'),
    ).toBeInTheDocument();
  });
});

describe('RingSizeForm', () => {
  it('shows an error when the profile fails to load', () => {
    profile.useProfile.mockReturnValue({
      status: 'error',
      preferences: null,
      savePreferences: vi.fn(),
    });

    render(<RingSizeForm />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load ring sizes.',
    );
  });
});
