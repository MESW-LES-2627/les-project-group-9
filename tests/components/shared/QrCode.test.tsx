import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {QrCode} from '~/components/shared/QrCode';

const VALUE = 'https://shop.example/products/aura?tryOn=1';
const LABEL = 'Try it on your phone';

function modules() {
  const svg = screen.getByRole('img', {name: LABEL});
  return svg.querySelectorAll('rect').length;
}

describe('QrCode', () => {
  it('renders an accessible SVG with a quiet zone', () => {
    render(<QrCode label={LABEL} value={VALUE} />);

    const svg = screen.getByRole('img', {name: LABEL});

    expect(svg).toHaveAttribute('viewBox');
    expect(Number(svg.getAttribute('viewBox')?.split(' ')[2])).toBeGreaterThan(
      21,
    );
    expect(modules()).toBeGreaterThan(20);
  });

  it('is deterministic for the same value and changes with the value', () => {
    const {rerender} = render(<QrCode label={LABEL} value={VALUE} />);
    const first = modules();

    rerender(<QrCode label={LABEL} value={VALUE} />);
    expect(modules()).toBe(first);

    rerender(<QrCode label={LABEL} value={`${VALUE}&variant=2`} />);
    expect(modules()).not.toBe(first);
  });
});
