import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {PreferencesFields} from '../../app/components/PreferencesForm';

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

    await user.click(screen.getByLabelText('Gold-plated'));
    await user.selectOptions(screen.getByLabelText('Undertone'), 'cool');
    await user.click(
      screen.getByRole('button', {name: 'Save preferences'}),
    );

    expect(onSave).toHaveBeenCalledWith({
      allergies: ['nickel', 'gold-plated'],
      skin: {tone: 'medium', undertone: 'cool'},
    });
    expect(screen.getByText('Preferences saved.')).toBeInTheDocument();
  });
});
