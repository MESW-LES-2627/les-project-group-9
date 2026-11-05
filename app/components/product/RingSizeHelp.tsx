import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {Link} from 'react-router';
import {useProfile} from '~/lib/profile/ProfileProvider';
import {
  RING_FINGERS,
  RING_HAND_LABELS,
  RING_HANDS,
  ringFingerLabel,
  ringHandOf,
} from '~/lib/profile/preferences';

const FOCUSABLE = 'button, a[href]';

/**
 * "? Help" button for ring products. Opens a dialog with the shopper's saved
 * ring sizes, or a prompt to add them. Renders nothing for guests.
 */
export function RingSizeHelp() {
  const {status, isLoggedIn, preferences} = useProfile();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  if (status !== 'ready' || !isLoggedIn) return null;

  const ringSizes = preferences?.ringSizes ?? {};
  const hasSavedSizes = RING_FINGERS.some((finger) => ringSizes[finger]);

  return (
    <div className="mt-3">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="text-[11px] uppercase tracking-widest text-primary underline underline-offset-4 hover:text-ink"
      >
        ? Help
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md bg-paper p-6 text-sm text-ink"
          >
            <h2 id={titleId} className="font-display text-2xl">
              Your ring sizes
            </h2>

            {hasSavedSizes ? (
              <div className="mt-4 space-y-4">
                {RING_HANDS.map((hand) => {
                  const fingers = RING_FINGERS.filter(
                    (finger) =>
                      ringHandOf(finger) === hand && ringSizes[finger],
                  );
                  if (!fingers.length) return null;

                  return (
                    <div key={hand}>
                      <h3 className="text-[11px] uppercase tracking-widest text-primary">
                        {RING_HAND_LABELS[hand]}
                      </h3>
                      <ul className="mt-2 space-y-1">
                        {fingers.map((finger) => (
                          <li key={finger}>
                            {ringFingerLabel(finger)}: {ringSizes[finger]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="leading-7 text-primary">
                  You have not saved your ring sizes yet.
                </p>
                <Link
                  to="/account/profile"
                  className="inline-block bg-primary px-6 py-3 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-ink"
                >
                  Add my ring sizes
                </Link>
              </div>
            )}

            <div className="mt-6 text-right">
              <button
                type="button"
                onClick={close}
                className="text-[11px] uppercase tracking-widest text-primary hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
