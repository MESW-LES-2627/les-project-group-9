import {useState, type FormEvent} from 'react';
import {useProfile} from '~/lib/profile/ProfileProvider';
import {
  ALLERGY_LABELS,
  ALLERGY_OPTIONS,
  normalizePreferences,
  SKIN_TONES,
  UNDERTONES,
} from '~/lib/profile/preferences';
import type {PreferenceProfile} from '~/lib/profile/types';

function label(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function PreferencesForm() {
  const {status, preferences, savePreferences} = useProfile();

  return (
    <section>
      <h2 className="font-display text-2xl text-ink">Preferences</h2>
      <p className="mt-2 text-sm leading-7 text-primary">
        Tell us what suits your skin so suggestions can fit you better.
      </p>

      {status === 'ready' ? (
        <PreferencesFields
          preferences={preferences}
          onSave={savePreferences}
        />
      ) : (
        <p className="mt-4 text-sm text-primary">Loading preferences…</p>
      )}
    </section>
  );
}

export function PreferencesFields({
  preferences,
  onSave,
}: {
  preferences: PreferenceProfile | null;
  onSave: (preferences: PreferenceProfile) => Promise<void>;
}) {
  const [allergies, setAllergies] = useState(preferences?.allergies ?? []);
  const [tone, setTone] = useState(preferences?.skin?.tone ?? '');
  const [undertone, setUndertone] = useState(
    preferences?.skin?.undertone ?? '',
  );
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );

  const toggleAllergy = (value: string) => {
    setState('idle');
    setAllergies((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('saving');

    void onSave(
      normalizePreferences({
        allergies,
        skin: {
          tone: tone || undefined,
          undertone: undertone || undefined,
        },
      }),
    )
      .then(() => setState('saved'))
      .catch(() => setState('error'));
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-6">
      <fieldset>
        <legend className="text-[11px] uppercase tracking-[0.15em] text-primary">
          Allergies
        </legend>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {ALLERGY_OPTIONS.map((value) => (
            <label
              key={value}
              className="flex items-center gap-2 border border-line bg-paper px-3 py-2 text-sm text-ink"
            >
              <input
                type="checkbox"
                checked={allergies.includes(value)}
                onChange={() => toggleAllergy(value)}
                className="h-4 w-4 accent-ink"
              />
              {ALLERGY_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.15em] text-primary">
            Skin tone
          </span>
          <select
            id="skin-tone"
            value={tone}
            onChange={(event) => {
              setTone(event.target.value);
              setState('idle');
            }}
            className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          >
            <option value="">Not set</option>
            {SKIN_TONES.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.15em] text-primary">
            Undertone
          </span>
          <select
            id="undertone"
            value={undertone}
            onChange={(event) => {
              setUndertone(event.target.value);
              setState('idle');
            }}
            className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          >
            <option value="">Not set</option>
            {UNDERTONES.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === 'saving'}
          className="bg-primary px-6 py-3 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-ink disabled:opacity-60"
        >
          {state === 'saving' ? 'Saving…' : 'Save preferences'}
        </button>

        <p
          aria-live="polite"
          className={`text-sm ${
            state === 'error' ? 'text-red-700' : 'text-primary'
          }`}
        >
          {state === 'saved'
            ? 'Preferences saved.'
            : state === 'error'
              ? 'Could not save preferences.'
              : null}
        </p>
      </div>
    </form>
  );
}
