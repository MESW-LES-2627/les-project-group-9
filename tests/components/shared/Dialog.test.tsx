import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {Dialog} from '~/components/shared/Dialog';

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(
      <Dialog onClose={vi.fn()} open={false} title="Try it">
        content
      </Dialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses the title as the accessible name and renders the footer', () => {
    render(
      <Dialog
        footer={<button type="button">Finish</button>}
        onClose={vi.fn()}
        open
        title="Try it"
      >
        content
      </Dialog>,
    );

    expect(screen.getByRole('dialog', {name: 'Try it'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Finish'})).toBeInTheDocument();
  });

  it('closes with Escape, the backdrop and the close label', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Dialog onClose={onClose} open title="Try it">
        content
      </Dialog>,
    );

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', {name: 'Close dialog'}));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
