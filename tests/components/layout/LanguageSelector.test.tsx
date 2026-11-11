import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createRoutesStub, redirect} from 'react-router';
import {describe, expect, it, vi} from 'vitest';
import {LanguageSelector} from '../../../app/components/layout/LanguageSelector';
import {
  getLocaleFromRequest,
  LOCALE_COOKIE,
  toAppLocale,
  useLocale,
  type LocaleCode,
} from '../../../app/lib/i18n';

function DocumentLanguage() {
  return <p data-testid="lang">{useLocale().tag}</p>;
}

function renderSelector(
  code: LocaleCode,
  {
    path = '/products/ring?Color=Gold#details',
    layout = 'popover',
  }: {path?: string; layout?: 'popover' | 'inline'} = {},
) {
  const onAction = vi.fn();
  const locale = toAppLocale(
    getLocaleFromRequest(
      new Request('http://localhost/', {
        headers: {Cookie: `${LOCALE_COOKIE}=${code}`},
      }),
    ),
  );

  const Stub = createRoutesStub([
    {
      id: 'root',
      path: '/products/:handle',
      loader: () => ({locale}),
      Component: () => (
        <>
          <LanguageSelector layout={layout} />
          <button type="button">Outside</button>
          <DocumentLanguage />
        </>
      ),
    },
    {
      path: '/locale',
      action: async ({request}) => {
        const form = Object.fromEntries(await request.formData());
        onAction(form);
        // Like the real /locale route: redirect back to the page.
        return redirect(String(form.redirectTo));
      },
    },
  ]);

  render(<Stub initialEntries={[path]} />);
  return onAction;
}

/** The trigger is the native <summary>; its name starts with the visible code. */
async function trigger(code: 'EN' | 'PT' | 'FR') {
  return screen
    .findByText(code, {selector: 'summary span'})
    .then((span) => span.closest('summary')) as Promise<HTMLElement>;
}

function details() {
  return document.querySelector('details') as HTMLDetailsElement;
}

function option(name: RegExp) {
  return screen.getByRole('button', {name});
}

describe('LanguageSelector', () => {
  it('shows the current language on a closed trigger', async () => {
    renderSelector('en');

    const summary = await trigger('EN');
    expect(summary).toHaveTextContent('EN');
    expect(summary).toHaveTextContent('Current language: English (US)');
    expect(details().open).toBe(false);
    expect(screen.getByTestId('lang')).toHaveTextContent('en-US');
  });

  it.each([
    ['pt', 'PT', 'Idioma atual: Português (Portugal)', 'pt-PT'],
    ['fr', 'FR', 'Langue actuelle : Français (France)', 'fr-FR'],
  ] as const)(
    'labels the trigger in the active language (%s)',
    async (code, short, label, tag) => {
      renderSelector(code);

      const summary = await trigger(short);
      // Raw text, so the French no-break space before ":" is checked exactly.
      expect(summary.textContent).toContain(label);
      expect(screen.getByTestId('lang')).toHaveTextContent(tag);
    },
  );

  it('lists EN, PT and FR with flags, names and the current one marked', async () => {
    const user = userEvent.setup();
    renderSelector('pt');

    await user.click(await trigger('PT'));
    expect(details().open).toBe(true);

    const list = screen.getByRole('list', {name: 'Idioma'});
    const options = within(list).getAllByRole('button');
    expect(options.map((button) => button.textContent)).toEqual([
      'EN English (US)',
      'PT Português (Portugal)',
      'FR Français (France)',
    ]);
    expect(option(/^PT/)).toHaveAttribute('aria-current', 'true');
    expect(option(/^EN/)).not.toHaveAttribute('aria-current');
    expect(option(/^FR/)).not.toHaveAttribute('aria-current');

    expect(screen.getByText('Français (France)')).toHaveAttribute(
      'lang',
      'fr-FR',
    );
    for (const flag of document.querySelectorAll('svg')) {
      expect(flag).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('posts the chosen language with the current path, query and hash', async () => {
    const user = userEvent.setup();
    const onAction = renderSelector('en');

    await user.click(await trigger('EN'));
    await user.click(option(/^FR/));

    await waitFor(() =>
      expect(onAction).toHaveBeenCalledWith({
        locale: 'fr',
        redirectTo: '/products/ring?Color=Gold#details',
      }),
    );
    expect(details().open).toBe(false);
  });

  it('supports arrow keys, Home, End and Escape', async () => {
    const user = userEvent.setup();
    renderSelector('pt');

    const summary = await trigger('PT');
    summary.focus();

    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(option(/^PT/)).toHaveFocus());
    expect(details().open).toBe(true);

    await user.keyboard('{ArrowDown}');
    expect(option(/^FR/)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(option(/^EN/)).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(option(/^FR/)).toHaveFocus();
    await user.keyboard('{Home}');
    expect(option(/^EN/)).toHaveFocus();
    await user.keyboard('{End}');
    expect(option(/^FR/)).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(details().open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it('chooses a language with the keyboard', async () => {
    const user = userEvent.setup();
    const onAction = renderSelector('en');

    (await trigger('EN')).focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(option(/^EN/)).toHaveFocus());
    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() =>
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({locale: 'pt'}),
      ),
    );
  });

  it('closes on an outside click and when focus leaves', async () => {
    const user = userEvent.setup();
    renderSelector('en');

    await user.click(await trigger('EN'));
    expect(details().open).toBe(true);
    await user.click(screen.getByRole('button', {name: 'Outside'}));
    expect(details().open).toBe(false);

    await user.click(await trigger('EN'));
    expect(details().open).toBe(true);
    option(/^FR/).focus();
    await user.tab();
    expect(screen.getByRole('button', {name: 'Outside'})).toHaveFocus();
    expect(details().open).toBe(false);
  });

  it('expands in place in the inline (mobile menu) layout', async () => {
    const user = userEvent.setup();
    renderSelector('en', {layout: 'inline'});

    await user.click(await trigger('EN'));
    const list = screen.getByRole('list', {name: 'Language'});
    expect(list.className).not.toContain('absolute');
    expect(within(list).getAllByRole('button')).toHaveLength(3);
  });
});
