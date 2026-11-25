import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {PriceDelta} from '~/components/product/PriceDelta';

describe('PriceDelta', () => {
  it('renders nothing when there is no add-on', () => {
    const {container} = render(<PriceDelta price={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Included for a zero amount', () => {
    render(<PriceDelta price={{amount: '0.00', currencyCode: 'EUR'}} />);
    expect(screen.getByText('Included')).toBeInTheDocument();
  });

  it('prefixes positive and negative amounts', () => {
    const {container, rerender} = render(
      <PriceDelta price={{amount: '35.00', currencyCode: 'EUR'}} />,
    );
    expect(container).toHaveTextContent('+€35');

    rerender(<PriceDelta price={{amount: '-5.00', currencyCode: 'EUR'}} />);
    expect(container).toHaveTextContent('−€5');
  });
});
