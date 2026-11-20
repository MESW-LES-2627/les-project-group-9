import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {ProductActionButton} from '~/components/product/ProductActionButton';

function renderButton(active: boolean, onClick = vi.fn()) {
  return render(
    <ProductActionButton active={active} label="Action" onClick={onClick}>
      <svg />
    </ProductActionButton>,
  );
}

describe('ProductActionButton', () => {
  it('shows the selected state with the primary pill', () => {
    renderButton(true);

    const button = screen.getByRole('button', {name: 'Action'});

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-active', 'true');
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('text-paper');
    expect(button.className).toContain('hover:bg-bark');
  });

  it('shows the idle state with the paper pill', () => {
    renderButton(false);

    const button = screen.getByRole('button', {name: 'Action'});

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('data-active', 'false');
    expect(button.className).toContain('bg-paper/90');
  });

  it('calls the handler', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderButton(false, onClick);

    await user.click(screen.getByRole('button', {name: 'Action'}));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
