import {useState, type FormEvent} from 'react';
import {useProfile} from '~/lib/profile/ProfileProvider';
import {
  RING_FINGERS,
  RING_FINGER_NAMES,
  RING_HAND_LABELS,
  RING_HANDS,
  US_RING_SIZES,
  ringFingerLabel,
} from '~/lib/profile/preferences';
import type {RingFinger} from '~/lib/profile/types';

type RingSizes = Partial<Record<RingFinger, string>>;

export function RingSizeForm() {
  const {status, preferences, savePreferences} = useProfile();

  return (
    <section>
      <h2 className="font-display text-2xl text-ink">Ring sizes</h2>
      <p className="mt-2 text-sm leading-7 text-primary">
        Save your US ring size for each finger. Ring products will show your
        saved sizes.
      </p>
      <a
        href="https://www.ringsize.app/"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-[11px] uppercase tracking-widest text-primary underline underline-offset-4 hover:text-ink"
      >
        How to measure your finger
      </a>

      {status === 'ready' ? (
        <RingSizeFields
          ringSizes={preferences?.ringSizes ?? {}}
          onSave={(ringSizes) => savePreferences({ringSizes})}
        />
      ) : status === 'error' ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load ring sizes. Refresh the page to try again.
        </p>
      ) : (
        <p className="mt-4 text-sm text-primary">Loading ring sizes…</p>
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
            {RING_HAND_LABELS[hand]}
          </legend>

          <div className="mt-3 grid gap-4 sm:grid-cols-5">
            {RING_FINGER_NAMES.map((name) => {
              const finger = `${hand}-${name}` as RingFinger;
              const id = `ring-size-${finger}`;

              return (
                <label key={finger} htmlFor={id} className="block">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-primary">
                    {ringFingerLabel(finger)}
                  </span>
                  <select
                    id={id}
                    value={sizes[finger] ?? ''}
                    onChange={(event) => change(finger, event.target.value)}
                    className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                  >
                    <option value="">Not set</option>
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
          className="bg-primary px-6 py-3 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-ink disabled:opacity-60"
        >
          {state === 'saving' ? 'Saving…' : 'Save ring sizes'}
        </button>

        <p
          aria-live="polite"
          className={`text-sm ${
            state === 'error' ? 'text-red-700' : 'text-primary'
          }`}
        >
          {state === 'saved'
            ? 'Ring sizes saved.'
            : state === 'error'
              ? 'Could not save ring sizes.'
              : null}
        </p>
      </div>
    </form>
  );
}
