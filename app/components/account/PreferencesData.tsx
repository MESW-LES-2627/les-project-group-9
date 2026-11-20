import {useState} from 'react';
import {useProfile} from '~/lib/profile/ProfileProvider';
import {useTranslation} from '~/lib/i18n';

type State = 'idle' | 'confirming' | 'deleting' | 'deleted' | 'error';

/** Download or delete the shopper's saved preferences. */
export function PreferencesData() {
  const {status, isLoggedIn, clearPreferences} = useProfile();
  const t = useTranslation();
  const [state, setState] = useState<State>('idle');

  if (status !== 'ready' || !isLoggedIn) return null;

  const remove = () => {
    setState('deleting');

    void clearPreferences()
      .then(() => setState('deleted'))
      .catch(() => setState('error'));
  };

  return (
    <section>
      <h2 className="font-display text-2xl text-ink">
        {t('profile.data.title')}
      </h2>
      <p className="mt-2 text-sm leading-7 text-primary">
        {t('profile.data.intro')}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <a
          href="/api/profile/preferences/export"
          download
          className="inline-flex min-h-11 items-center border border-line px-6 text-[11px] uppercase tracking-widest text-ink transition-colors hover:border-ink"
        >
          {t('profile.data.download')}
        </a>

        {state === 'confirming' ? (
          <>
            <button
              type="button"
              onClick={remove}
              className="inline-flex min-h-11 items-center border border-red-700 px-6 text-[11px] uppercase tracking-widest text-red-700 transition-colors hover:bg-red-700 hover:text-white"
            >
              {t('profile.data.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setState('idle')}
              className="inline-flex min-h-11 items-center border border-line px-6 text-[11px] uppercase tracking-widest text-primary transition-colors hover:border-ink hover:text-ink"
            >
              {t('profile.data.cancel')}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={state === 'deleting'}
            onClick={() => setState('confirming')}
            className="inline-flex min-h-11 items-center border border-line px-6 text-[11px] uppercase tracking-widest text-primary transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
          >
            {state === 'deleting'
              ? t('profile.data.deleting')
              : t('profile.data.delete')}
          </button>
        )}
      </div>

      {state === 'confirming' ? (
        <p className="mt-3 text-sm text-primary">
          {t('profile.data.deleteConfirm')}
        </p>
      ) : null}

      <p
        aria-live="polite"
        className={`mt-3 text-sm ${
          state === 'error' ? 'text-red-700' : 'text-primary'
        }`}
      >
        {state === 'deleted'
          ? t('profile.data.deleted')
          : state === 'error'
            ? t('profile.data.deleteError')
            : null}
      </p>
    </section>
  );
}
