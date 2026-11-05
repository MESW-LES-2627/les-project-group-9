import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {ConfirmDialog} from '~/components/ConfirmDialog';

function Harness({
  onCancel,
  onConfirm,
}: {
  onCancel?: () => void;
  onConfirm?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open dialog
      </button>
      <ConfirmDialog
        confirmLabel="Yes, add to bag"
        onCancel={() => {
          onCancel?.();
          setOpen(false);
        }}
        onConfirm={() => {
          onConfirm?.();
          setOpen(false);
        }}
        open={open}
        title="Allergy warning"
      >
        This piece contains Nickel.
      </ConfirmDialog>
    </>
  );
}

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    render(<Harness />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('portals into the body and locks page scroll while open', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', {name: 'Open dialog'}));

    const dialog = screen.getByRole('dialog');

    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.documentElement.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('cancels with Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);

    const trigger = screen.getByRole('button', {name: 'Open dialog'});
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('cancels when the overlay is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);

    await user.click(screen.getByRole('button', {name: 'Open dialog'}));
    await user.click(screen.getByRole('button', {name: 'Close dialog'}));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps keyboard focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', {name: 'Open dialog'}));

    const dialog = screen.getByRole('dialog');
    const cancel = screen.getByRole('button', {name: 'Cancel'});
    const confirm = screen.getByRole('button', {name: 'Yes, add to bag'});

    expect(dialog).toHaveFocus();

    await user.tab();
    expect(cancel).toHaveFocus();

    await user.tab();
    expect(confirm).toHaveFocus();

    // Tab from the last control wraps back to the first one.
    await user.tab();
    expect(cancel).toHaveFocus();

    // Shift+Tab from the first control wraps back to the last one.
    await user.tab({shift: true});
    expect(confirm).toHaveFocus();
  });

  it('confirms with the confirm button', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', {name: 'Open dialog'}));
    await user.click(screen.getByRole('button', {name: 'Yes, add to bag'}));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
