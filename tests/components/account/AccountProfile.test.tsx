import type {ReactNode} from 'react';
import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  actionData: undefined as unknown,
  state: 'idle',
}));

vi.mock('react-router', () => ({
  data: vi.fn(),
  Form: ({children}: {children: ReactNode}) => <form>{children}</form>,
  useActionData: () => mocks.actionData,
  useLoaderData: () => ({
    preferenceOptions: {colors: [], materials: []},
  }),
  useNavigation: () => ({state: mocks.state}),
  useOutletContext: () => ({
    customer: {id: 'customer-1', firstName: 'Ana', lastName: 'Silva'},
  }),
}));

vi.mock('~/components/account/PreferencesForm', () => ({
  PreferencesForm: () => null,
}));

vi.mock('~/components/account/RingSizeForm', () => ({
  RingSizeForm: () => null,
}));

vi.mock('~/components/account/PreferencesData', () => ({
  PreferencesData: () => null,
}));

import AccountProfile from '~/routes/account.profile';
import {LocaleContext, toAppLocale, type LocaleCode} from '~/lib/i18n';

const LANGUAGE = {en: 'EN', pt: 'PT_PT', fr: 'FR'} as const;

function inLocale(code: LocaleCode) {
  return render(
    <LocaleContext.Provider
      value={toAppLocale({language: LANGUAGE[code], country: 'US'})}
    >
      <AccountProfile />
    </LocaleContext.Provider>,
  );
}

const TEXT = {
  en: {
    heading: 'Personal information',
    firstName: 'First name',
    lastName: 'Last name',
    update: 'Update',
    updated: 'Profile updated.',
  },
  pt: {
    heading: 'Informações pessoais',
    firstName: 'Nome próprio',
    lastName: 'Apelido',
    update: 'Atualizar',
    updated: 'Perfil atualizado.',
  },
  fr: {
    heading: 'Informations personnelles',
    firstName: 'Prénom',
    lastName: 'Nom',
    update: 'Mettre à jour',
    updated: 'Profil mis à jour.',
  },
} as const;

const codes = Object.keys(TEXT) as LocaleCode[];

beforeEach(() => {
  mocks.actionData = undefined;
  mocks.state = 'idle';
});

describe('AccountProfile in each language', () => {
  it.each(codes)('%s: form labels and button', (code) => {
    inLocale(code);

    expect(
      screen.getByRole('heading', {name: TEXT[code].heading}),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(TEXT[code].firstName)).toHaveValue('Ana');
    expect(screen.getByLabelText(TEXT[code].lastName)).toHaveValue('Silva');
    expect(
      screen.getByRole('button', {name: TEXT[code].update}),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each(codes)('%s: confirms a successful save', (code) => {
    mocks.actionData = {
      error: null,
      customer: {id: 'customer-1', firstName: 'Ana', lastName: ''},
    };

    inLocale(code);

    expect(screen.getByRole('status')).toHaveTextContent(TEXT[code].updated);
  });

  it('shows the error instead of the confirmation when the save fails', () => {
    mocks.actionData = {error: 'Name is invalid', customer: null};

    inLocale('en');

    expect(screen.getByRole('alert')).toHaveTextContent('Name is invalid');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
