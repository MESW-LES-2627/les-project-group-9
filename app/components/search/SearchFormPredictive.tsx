import {
  useFetcher,
  useNavigate,
  type FormProps,
  type Fetcher,
} from 'react-router';
import React, {useCallback, useRef, useEffect} from 'react';
import type {PredictiveSearchReturn} from '~/lib/search';
import {useAside} from '~/components/layout/Aside';

type SearchFormPredictiveChildren = (args: {
  fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void;
  goToSearch: () => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  fetcher: Fetcher<PredictiveSearchReturn>;
}) => React.ReactNode;

type SearchFormPredictiveProps = Omit<FormProps, 'children'> & {
  children: SearchFormPredictiveChildren | null;
};

export const SEARCH_ENDPOINT = '/search';

/**
 *  Search form component that sends search requests to the `/search` route
 **/
export function SearchFormPredictive({
  children,
  className = 'predictive-search-form',
  ...props
}: SearchFormPredictiveProps) {
  const fetcher = useFetcher<PredictiveSearchReturn>({key: 'search'});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const aside = useAside();

  /** Reset the input value and blur the input */
  function resetInput(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    goToSearch();
  }

  /** Navigate to the search page with the current input value */
  function goToSearch() {
    const term = inputRef.current?.value.trim() ?? '';
    void navigate(
      SEARCH_ENDPOINT +
      (term ? `?q=${encodeURIComponent(term)}` : ''),
    );
    aside.close();
  }

  const {data, state, submit} = fetcher;

  const fetchTerm = useCallback(
    (term: string) =>
      void submit(
        {q: term, limit: 5, predictive: true},
        {method: 'GET', action: SEARCH_ENDPOINT},
      ),
    [submit],
  );

  /** Fetch search results based on the input value */
  function fetchResults(event: React.ChangeEvent<HTMLInputElement>) {
    fetchTerm(event.target.value || '');
  }

  // ensure the passed input has a type of search, because SearchResults
  // will select the element based on the input
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search');
  }, []);

  const checkedData = useRef<typeof data>(undefined);

  useEffect(() => {
    if (state !== 'idle' || !data || checkedData.current === data) return;
    checkedData.current = data;

    const value = inputRef.current?.value.trim() ?? '';

    if (data.term !== value) fetchTerm(value);
  }, [state, data, fetchTerm]);


  const previousAsideType = useRef(aside.type);
  const {load} = fetcher;

  useEffect(() => {
    const wasSearch = previousAsideType.current === 'search';
    previousAsideType.current = aside.type;

    if (!wasSearch || aside.type === 'search') return;

    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.blur();
    }

    void load(`${SEARCH_ENDPOINT}?predictive=true&q=&limit=5`);
  }, [aside.type, load]);

  if (typeof children !== 'function') {
    return null;
  }

  return (
    <fetcher.Form {...props} className={className} onSubmit={resetInput}>
      {children({inputRef, fetcher, fetchResults, goToSearch})}
    </fetcher.Form>
  );
}
