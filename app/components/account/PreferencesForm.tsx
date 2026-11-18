import {useState, type FormEvent} from 'react';
import {useProfile} from '~/lib/profile/ProfileProvider';
import {
  ALLERGY_OPTIONS,
  normalizePreferences,
  SKIN_TONES,
  UNDERTONES,
} from '~/lib/profile/preferences';
import type {
  PreferenceOption,
  PreferenceOptions,
  PreferenceProfile,
} from '~/lib/profile/types';
import {useTranslation} from '~/lib/i18n';

const EMPTY_OPTIONS: PreferenceOptions = {colors: [], materials: []};

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function PreferencesForm({
  options = EMPTY_OPTIONS,
}: {
  options?: PreferenceOptions;
}) {
  const {status, preferences, savePreferences} = useProfile();
  const t = useTranslation();

  return (
    <section>
      <h2 className="font-display text-2xl text-ink">{t('preferences.title')}</h2>
      <p className="mt-2 text-sm leading-7 text-primary">
        {t('preferences.intro')}
      </p>

      {status === 'ready' ? (
        <PreferencesFields
          preferences={preferences}
          options={options}
          onSave={savePreferences}
        />
      ) : status === 'error' ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {t('preferences.loadError')}
        </p>
      ) : (
        <p className="mt-4 text-sm text-primary">{t('preferences.loading')}</p>
      )}
    </section>
  );
}

function PreferenceOptionGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: PreferenceOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[11px] uppercase tracking-[0.15em] text-primary">
        {legend}
      </legend>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 border border-line bg-paper px-3 py-2 text-sm text-ink"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className="h-4 w-4 accent-ink"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PreferencesFields({
  preferences,
  options = EMPTY_OPTIONS,
  onSave,
}: {
  preferences: PreferenceProfile | null;
  options?: PreferenceOptions;
  onSave: (preferences: PreferenceProfile) => Promise<void>;
}) {
  const t = useTranslation();
  const [allergies, setAllergies] = useState(preferences?.allergies ?? []);
  const [colors, setColors] = useState(preferences?.preferredColors ?? []);
  const [materials, setMaterials] = useState(
    preferences?.preferredMaterials ?? [],
  );
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
        preferredColors: colors,
        preferredMaterials: materials,
      }),
    )
      .then(() => setState('saved'))
      .catch(() => setState('error'));
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-6">
      <fieldset>
        <legend className="text-[11px] uppercase tracking-[0.15em] text-primary">
          {t('preferences.allergies')}
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
              {t(`allergen.${value}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.15em] text-primary">
            {t('preferences.skinTone')}
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
            <option value="">{t('common.notSet')}</option>
            {SKIN_TONES.map((value) => (
              <option key={value} value={value}>
                {t(`preferences.tone.${value}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.15em] text-primary">
            {t('preferences.undertone')}
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
            <option value="">{t('common.notSet')}</option>
            {UNDERTONES.map((value) => (
              <option key={value} value={value}>
                {t(`preferences.undertone.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {options.colors.length ? (
        <PreferenceOptionGroup
          legend={t('preferences.colors')}
          options={options.colors}
          selected={colors}
          onToggle={(value) => {
            setColors((current) => toggleValue(current, value));
            setState('idle');
          }}
        />
      ) : null}

      {options.materials.length ? (
        <PreferenceOptionGroup
          legend={t('preferences.materials')}
          options={options.materials}
          selected={materials}
          onToggle={(value) => {
            setMaterials((current) => toggleValue(current, value));
            setState('idle');
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === 'saving'}
          className="bg-primary px-6 py-3 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-ink disabled:opacity-60"
        >
          {state === 'saving' ? t('common.saving') : t('preferences.save')}
        </button>

        <p
          aria-live="polite"
          className={`text-sm ${
            state === 'error' ? 'text-red-700' : 'text-primary'
          }`}
        >
          {state === 'saved'
            ? t('preferences.saved')
            : state === 'error'
              ? t('preferences.saveError')
              : null}
        </p>
      </div>
    </form>
  );
}
