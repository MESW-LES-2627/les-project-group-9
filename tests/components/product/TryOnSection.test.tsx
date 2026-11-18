import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

vi.mock('~/components/product/TryOnButton', () => ({
  TryOnButton: ({title}: {title: string}) => (
    <button type="button">Try on {title}</button>
  ),
}));

import {TryOnSection} from '~/components/product/TryOnSection';

const PIECE = {
  kind: 'earring' as const,
  overlayUrl: 'https://cdn.example/earring.png?cors=1',
  sizeCm: 2,
};

function renderSection() {
  return render(
    <TryOnSection
      isMobile={false}
      piece={PIECE}
      title="Aura Earrings"
    />,
  );
}

describe('TryOnSection', () => {
  it('labels the section with the try-on title', () => {
    renderSection();

    expect(
      screen.getByRole('region', {name: 'See it on you'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {name: 'See it on you', level: 2}),
    ).toBeInTheDocument();
  });

  it('renders the try-on button for the piece', () => {
    renderSection();

    expect(
      screen.getByRole('button', {name: 'Try on Aura Earrings'}),
    ).toBeInTheDocument();
  });
});
