import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const matches = vi.hoisted(() => ({useAllergenMatches: vi.fn()}));

vi.mock('~/lib/profile/useAllergenMatches', () => ({
  useAllergenMatches: matches.useAllergenMatches,
}));

import {AllergenBadge} from '../../app/components/AllergenBadge';

beforeEach(() => {
  matches.useAllergenMatches.mockReset();
});

describe('AllergenBadge', () => {
  it('shows a warning badge when the product matches an allergy', () => {
    matches.useAllergenMatches.mockReturnValue({
      matches: ['nickel'],
      loading: false,
    });

    render(<AllergenBadge allergens={{value: '["nickel"]'}} />);

    expect(screen.getByText('Allergen')).toHaveClass('bg-amber-200');
  });

  it('renders nothing when the product does not match', () => {
    matches.useAllergenMatches.mockReturnValue({matches: [], loading: false});

    render(<AllergenBadge allergens={{value: '["zinc"]'}} />);

    expect(screen.queryByText('Allergen')).not.toBeInTheDocument();
  });
});
