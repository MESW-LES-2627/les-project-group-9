import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createRoutesStub} from 'react-router';
import {describe, expect, it, vi} from 'vitest';
import {LanguageSelector} from '../../../app/components/layout/Header';
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
  path = '/products/ring?Color=Gold',
  onAction = vi.fn(),
) {
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
          <LanguageSelector />
          <DocumentLanguage />
        </>
      ),
    },
    {
      path: '/locale',
      action: async ({request}) => {
        onAction(Object.fromEntries(await request.formData()));
        return null;
      },
    },
  ]);

  render(<Stub initialEntries={[path]} />);
  return onAction;
}

describe('LanguageSelector', () => {
  it('shows EN-US, PT and FR and marks English as active by default', async () => {
    renderSelector('en');

    const group = await screen.findByRole('group', {name: 'Language'});
    expect(within(group).getAllByRole('button')).toHaveLength(3);
    expect(
      screen.getByRole('button', {name: 'EN — English (US)'}),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', {name: 'PT — Português (Portugal)'}),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', {name: 'FR — Français (France)'}),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('lang')).toHaveTextContent('en-US');
  });

  it('labels the selector in French when FR is active', async () => {
    renderSelector('fr');

    expect(
      await screen.findByRole('group', {name: 'Langue'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'FR — Français (France)'}),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', {name: 'EN — English (US)'}),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('lang')).toHaveTextContent('fr-FR');
  });

  it('marks each language name with its own language for screen readers', async () => {
    renderSelector('en');
    await screen.findByRole('group', {name: 'Language'});

    expect(screen.getByText('FR — Français (France)')).toHaveAttribute(
      'lang',
      'fr-FR',
    );
    expect(screen.getByText('PT — Português (Portugal)')).toHaveAttribute(
      'lang',
      'pt-PT',
    );
  });

  it('labels the selector in Portuguese when PT is active', async () => {
    renderSelector('pt');

    expect(
      await screen.findByRole('group', {name: 'Idioma'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'PT — Português (Portugal)'}),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('lang')).toHaveTextContent('pt-PT');
  });

  it('posts French with the current path and query', async () => {
    const onAction = renderSelector('pt');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', {name: 'FR — Français (France)'}),
    );

    await waitFor(() =>
      expect(onAction).toHaveBeenCalledWith({
        locale: 'fr',
        redirectTo: '/products/ring?Color=Gold',
      }),
    );
  });

  it('posts the chosen language and the current path with its query', async () => {
    const onAction = renderSelector('en');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', {name: 'PT — Português (Portugal)'}),
    );

    await waitFor(() =>
      expect(onAction).toHaveBeenCalledWith({
        locale: 'pt',
        redirectTo: '/products/ring?Color=Gold',
      }),
    );
  });

  it('can be operated with the keyboard', async () => {
    const onAction = renderSelector('en');
    const user = userEvent.setup();

    await screen.findByRole('group', {name: 'Language'});
    await user.tab();
    expect(
      screen.getByRole('button', {name: 'EN — English (US)'}),
    ).toHaveFocus();
    await user.tab();
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({locale: 'pt'}),
      ),
    );
  });
});
