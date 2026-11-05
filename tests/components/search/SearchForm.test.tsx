import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({submit: vi.fn()}));

vi.mock('react-router', () => ({
  Form: ({
    children,
    ...props
  }: React.PropsWithChildren<React.FormHTMLAttributes<HTMLFormElement>>) => (
    <form
      {...props}
      onSubmit={(event) => {
        event.preventDefault();
        mocks.submit(Object.fromEntries(new FormData(event.currentTarget)));
      }}
    >
      {children}
    </form>
  ),
}));

import {SearchForm} from '~/components/search/SearchForm';

function renderForm() {
  return render(
    <SearchForm action="/search">
      {({inputRef}) => (
        <>
          <input aria-label="Search" name="q" ref={inputRef} type="search" />
          <button type="submit">Search</button>
        </>
      )}
    </SearchForm>,
  );
}

beforeEach(() => {
  mocks.submit.mockReset();
});

describe('SearchForm', () => {
  it('submits the search term', async () => {
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'ring');
    await user.click(screen.getByRole('button', {name: 'Search'}));

    expect(mocks.submit).toHaveBeenCalledWith({q: 'ring'});
  });

  it('focuses the input with Cmd+K', async () => {
    const user = userEvent.setup();

    renderForm();

    await user.keyboard('{Meta>}k{/Meta}');

    expect(screen.getByRole('searchbox', {name: 'Search'})).toHaveFocus();
  });

  it('removes focus from the input with Escape', async () => {
    const user = userEvent.setup();

    renderForm();

    const input = screen.getByRole('searchbox', {name: 'Search'});

    await user.click(input);
    await user.keyboard('{Escape}');

    expect(input).not.toHaveFocus();
  });
});
