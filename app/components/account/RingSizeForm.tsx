import {useState, type FormEvent} from 'react';
import {useProfile} from '~/lib/profile/ProfileProvider';
import {
  RING_FINGERS,
  RING_FINGER_NAMES,
  RING_HANDS,
  US_RING_SIZES,
} from '~/lib/profile/preferences';
import type {RingFinger} from '~/lib/profile/types';
import {useTranslation} from '~/lib/i18n';

type RingSizes = Partial<Record<RingFinger, string>>;

export function RingSizeForm() {
  const {status, preferences, savePreferences} = useProfile();
  const t = useTranslation();

  return (
    <section>
      <h2 className="font-display text-2xl text-ink">{t('ring.title')}</h2>
      <p className="mt-2 text-sm leading-7 text-primary">{t('ring.intro')}</p>
      <a
        href="https://www.ringsize.app/"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-[11px] uppercase tracking-widest text-primary underline underline-offset-4 hover:text-bark"
      >
        {t('ring.howToMeasure')}
      </a>

      {status === 'ready' ? (
        <RingSizeFields
          ringSizes={preferences?.ringSizes ?? {}}
          onSave={(ringSizes) => savePreferences({ringSizes})}
        />
      ) : status === 'error' ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {t('ring.loadError')}
        </p>
      ) : (
        <p className="mt-4 text-sm text-primary">{t('ring.loading')}</p>
      )}
    </section>
  );
}

export function RingSizeFields({
  ringSizes,
  onSave,
}: {
  ringSizes: RingSizes;
  onSave: (ringSizes: RingSizes) => Promise<void>;
}) {
  const t = useTranslation();
  const [sizes, setSizes] = useState<RingSizes>(ringSizes);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );

  const change = (finger: RingFinger, value: string) => {
    setState('idle');
    setSizes((current) => ({...current, [finger]: value || undefined}));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('saving');

    const cleaned: RingSizes = {};
    for (const finger of RING_FINGERS) {
      const size = sizes[finger];
      if (size) cleaned[finger] = size;
    }

    void onSave(cleaned)
      .then(() => setState('saved'))
      .catch(() => setState('error'));
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-6">
      {RING_HANDS.map((hand) => (
        <fieldset key={hand}>
          <legend className="text-[11px] uppercase tracking-[0.15em] text-primary">
            {t(`ring.hand.${hand}`)}
          </legend>

          <div className="mt-3 grid gap-4 sm:grid-cols-5">
            {RING_FINGER_NAMES.map((name) => {
              const finger = `${hand}-${name}` as RingFinger;
              const id = `ring-size-${finger}`;

              return (
                <label key={finger} htmlFor={id} className="block">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-primary">
                    {t(`ring.finger.${name}`)}
                  </span>
                  <select
                    id={id}
                    value={sizes[finger] ?? ''}
                    onChange={(event) => change(finger, event.target.value)}
                    className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                  >
                    <option value="">{t('common.notSet')}</option>
                    {US_RING_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === 'saving'}
          className="bg-primary px-6 py-3 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-bark disabled:opacity-60"
        >
          {state === 'saving' ? t('common.saving') : t('ring.save')}
        </button>

        <p
          aria-live="polite"
          className={`text-sm ${
            state === 'error' ? 'text-red-700' : 'text-primary'
          }`}
        >
          {state === 'saved'
            ? t('ring.saved')
            : state === 'error'
              ? t('ring.saveError')
              : null}
        </p>
      </div>
    </form>
  );
}
