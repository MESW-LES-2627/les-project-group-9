import {render} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

type FetcherMock = {
  state: 'idle' | 'loading' | 'submitting';
  data: {type: 'predictive'; term: string} | undefined;
  submit: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  Form: (props: React.PropsWithChildren<object>) => React.ReactElement;
};

const fetcher = vi.hoisted<FetcherMock>(() => ({
  state: 'idle',
  data: undefined,
  submit: vi.fn(),
  load: vi.fn(),
  Form: ({children}) => <form>{children}</form>,
}));

vi.mock('react-router', () => ({
  useFetcher: () => fetcher,
  useNavigate: () => vi.fn(),
}));

vi.mock('~/components/layout/Aside', () => ({
  useAside: () => ({type: 'search', close: vi.fn()}),
}));

import {SearchFormPredictive} from '~/components/search/SearchFormPredictive';

function Form() {
  return (
    <SearchFormPredictive>
      {({inputRef}) => (
        <input aria-label="Search" defaultValue="Heart" ref={inputRef} />
      )}
    </SearchFormPredictive>
  );
}

function result(term: string) {
  return {type: 'predictive' as const, term};
}

beforeEach(() => {
  fetcher.state = 'idle';
  fetcher.data = undefined;
  fetcher.submit.mockReset();
});

describe('SearchFormPredictive', () => {
  it('refetches when a stale response replaces the current results', () => {
    const {rerender} = render(<Form />);

    // The empty-term request fired on focus landed after the "Heart" one.
    fetcher.data = result('');
    rerender(<Form />);

    expect(fetcher.submit).toHaveBeenCalledTimes(1);
    expect(fetcher.submit).toHaveBeenCalledWith(
      {q: 'Heart', limit: 5, predictive: true},
      {method: 'GET', action: '/search'},
    );
  });

  it('keeps results that match the input', () => {
    const {rerender} = render(<Form />);

    fetcher.data = result('Heart');
    rerender(<Form />);

    expect(fetcher.submit).not.toHaveBeenCalled();
  });

  it('refetches at most once for the same response', () => {
    const {rerender} = render(<Form />);

    fetcher.data = result('');
    rerender(<Form />);

    // A failed refetch leaves the same data behind.
    fetcher.state = 'loading';
    rerender(<Form />);
    fetcher.state = 'idle';
    rerender(<Form />);

    expect(fetcher.submit).toHaveBeenCalledTimes(1);
  });
});
