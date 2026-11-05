import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {MockShopNotice} from '~/components/layout/MockShopNotice';

describe('MockShopNotice', () => {
  it('renders the heading', () => {
    render(<MockShopNotice />);
    expect(
      screen.getByRole('heading', {name: 'Welcome to Hydrogen!'}),
    ).toBeInTheDocument();
  });
});
