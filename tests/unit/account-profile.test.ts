import {describe, expect, it} from 'vitest';
import {action} from '../../app/routes/account.profile';

type ActionArgs = Parameters<typeof action>[0];
type CustomerInput = {firstName?: string; lastName?: string};

function contextWith({errors}: {errors?: Array<{message: string}>} = {}) {
  const calls: CustomerInput[] = [];

  const context = {
    customerAccount: {
      i18n: {language: 'EN'},
      mutate: async (
        _mutation: string,
        options: {variables: {customer: CustomerInput}},
      ) => {
        calls.push(options.variables.customer);

        return {
          errors,
          data: errors
            ? null
            : {
                customerUpdate: {
                  customer: {id: 'customer-1', ...options.variables.customer},
                },
              },
        };
      },
    },
  } as unknown as ActionArgs['context'];

  return {context, calls};
}

function callAction(
  context: ActionArgs['context'],
  fields: Record<string, string>,
  method = 'PUT',
) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);

  return action({
    request: new Request('http://localhost/account/profile', {
      method,
      body: method === 'GET' ? undefined : body,
    }),
    context,
    params: {},
  } as ActionArgs) as Promise<{
    error: string | null;
    customer: CustomerInput | null;
    init?: {status: number};
    data?: {error: string};
  }>;
}

describe('account profile action', () => {
  it('updates the first and last name', async () => {
    const {context, calls} = contextWith();

    const result = await callAction(context, {
      firstName: 'Ana',
      lastName: 'Silva',
    });

    expect(calls).toEqual([{firstName: 'Ana', lastName: 'Silva'}]);
    expect(result.customer).toMatchObject({firstName: 'Ana', lastName: 'Silva'});
    expect(result.error).toBeNull();
  });

  it('sends an empty last name so it is cleared', async () => {
    const {context, calls} = contextWith();

    const result = await callAction(context, {firstName: 'Ana', lastName: ''});

    expect(calls).toEqual([{firstName: 'Ana', lastName: ''}]);
    expect(result.customer).toMatchObject({lastName: ''});
  });

  it('accepts one-character names', async () => {
    const {context, calls} = contextWith();

    await callAction(context, {firstName: 'A', lastName: 'B'});

    expect(calls).toEqual([{firstName: 'A', lastName: 'B'}]);
  });

  it('trims surrounding spaces', async () => {
    const {context, calls} = contextWith();

    await callAction(context, {firstName: '  Ana ', lastName: '   '});

    expect(calls).toEqual([{firstName: 'Ana', lastName: ''}]);
  });

  it('ignores fields other than the names', async () => {
    const {context, calls} = contextWith();

    await callAction(context, {firstName: 'Ana', email: 'a@example.com'});

    expect(calls).toEqual([{firstName: 'Ana'}]);
  });

  it('returns the API error instead of reporting success', async () => {
    const {context} = contextWith({errors: [{message: 'Name is invalid'}]});

    const result = await callAction(context, {firstName: 'Ana', lastName: ''});

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({error: 'Name is invalid', customer: null});
  });

  it('rejects methods other than PUT', async () => {
    const {context, calls} = contextWith();

    const result = await callAction(context, {}, 'POST');

    expect(result.init?.status).toBe(405);
    expect(calls).toHaveLength(0);
  });
});
