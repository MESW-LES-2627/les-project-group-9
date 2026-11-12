import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import {Form, useLocation} from 'react-router';
import {Icon} from '~/components/shared/Icon';
import {
  LOCALE_CODES,
  LOCALES,
  useLocale,
  useTranslation,
  type FlagKey,
} from '~/lib/i18n';

type SelectorLayout = 'popover' | 'inline';

/**
 * Language dropdown: a native `<details>` disclosure whose trigger shows the
 * current language (flag + short code) and whose panel lists one submit button
 * per entry in `LOCALES`. Choosing one posts to `/locale` with the current
 * path, query and hash, so it also works without JavaScript.
 *
 * With JavaScript it adds: Arrow keys / Home / End between options, Escape to
 * close and return focus to the trigger, closing on outside click, when focus
 * leaves, and after a choice. Every target is at least 44×44 CSS px.
 *
 * - `popover` (desktop header): the panel floats below the trigger.
 * - `inline` (mobile menu): the panel expands in place, so it cannot be clipped.
 */
export function LanguageSelector({
  className = '',
  layout = 'popover',
  onSelect,
}: {
  className?: string;
  layout?: SelectorLayout;
  /** Called when a language is submitted, e.g. to close the mobile menu. */
  onSelect?: () => void;
}) {
  const t = useTranslation();
  const {code: activeCode} = useLocale();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const listId = useId();
  const active = LOCALES[activeCode];
  const redirectTo = `${location.pathname}${location.search}${location.hash}`;

  // Close after any navigation, including the redirect back from /locale.
  useEffect(() => {
    setOpen(false);
  }, [location.key, activeCode]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function options(): HTMLButtonElement[] {
    return Array.from(
      detailsRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[name="locale"]',
      ) ?? [],
    );
  }

  function focusOption(index: number) {
    const items = options();
    if (!items.length) return;
    items[(index + items.length) % items.length].focus();
  }

  function focusActiveOption() {
    focusOption(Math.max(0, LOCALE_CODES.indexOf(activeCode)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const items = options();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);

    switch (event.key) {
      case 'Escape':
        if (!open) return;
        // Keep the drawer open: only this disclosure closes.
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        summaryRef.current?.focus();
        return;
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        if (!open) {
          setOpen(true);
          requestAnimationFrame(focusActiveOption);
        } else if (index === -1) {
          focusActiveOption();
        } else {
          focusOption(index + step);
        }
        return;
      }
      case 'Home':
      case 'End':
        if (!open || index === -1) return;
        event.preventDefault();
        focusOption(event.key === 'Home' ? 0 : items.length - 1);
        return;
    }
  }

  // Tabbing out of the trigger or the last option closes the panel.
  function onBlur(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && !detailsRef.current?.contains(next)) setOpen(false);
  }

  const panel =
    layout === 'popover'
      ? 'absolute right-0 top-full z-10 mt-1 min-w-[15rem] border border-line bg-paper py-1 shadow-stack'
      : 'mt-1 border-t border-line';

  return (
    <Form
      action="/locale"
      className={className}
      method="post"
      onSubmit={() => {
        setOpen(false);
        onSelect?.();
      }}
    >
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <details
        className={layout === 'popover' ? 'relative' : ''}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        open={open}
        ref={detailsRef}
      >
        <summary
          aria-controls={listId}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="flex min-h-[44px] min-w-[44px] cursor-pointer list-none items-center gap-2 px-2 text-xs font-medium tracking-[0.12em] text-primary hover:text-ink [&::-webkit-details-marker]:hidden"
          ref={summaryRef}
        >
          <LanguageFlag flag={active.flag} />
          <span>{active.short}</span>
          <span className="sr-only">
            {`, ${t('language.current', {language: active.name})}`}
          </span>
          <Icon
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
            name="chevron"
            size={14}
          />
        </summary>

        <ul
          aria-label={t('language.label')}
          className={`${panel} normal-case tracking-normal`}
          id={listId}
        >
          {LOCALE_CODES.map((code) => {
            const locale = LOCALES[code];
            const current = code === activeCode;
            return (
              <li key={code}>
                <button
                  aria-current={current ? 'true' : undefined}
                  className={`flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-sm hover:bg-cream focus-visible:bg-cream ${
                    current ? 'text-ink' : 'text-primary'
                  }`}
                  name="locale"
                  onBlur={onBlur}
                  onKeyDown={onKeyDown}
                  type="submit"
                  value={code}
                >
                  <LanguageFlag flag={locale.flag} />
                  <span className="w-6 text-xs font-medium tracking-[0.12em]">
                    {locale.short}
                  </span>{' '}
                  <span className="flex-1" lang={locale.tag}>
                    {locale.name}
                  </span>
                  {current ? <Icon name="check" size={16} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </details>
    </Form>
  );
}

const US_STRIPES = Array.from({length: 6}, (_, index) => 1 + index * 2);

/**
 * Small inline flag (20×14 px). Decorative: the short code and language name
 * next to it carry the meaning. Inline SVG, so no emoji (Windows renders flag
 * emoji as letters) and no external requests.
 */
export function LanguageFlag({flag}: {flag: FlagKey}) {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0 rounded-[2px] ring-1 ring-line"
      focusable="false"
      height={14}
      viewBox="0 0 30 21"
      width={20}
    >
      {flag === 'fr' ? (
        <>
          <rect fill="#002654" height="21" width="10" />
          <rect fill="#ffffff" height="21" width="10" x="10" />
          <rect fill="#ce1126" height="21" width="10" x="20" />
        </>
      ) : flag === 'pt' ? (
        <>
          <rect fill="#046a38" height="21" width="12" />
          <rect fill="#da291c" height="21" width="18" x="12" />
          <circle cx="12" cy="10.5" fill="#ffe900" r="4.5" />
          <rect
            fill="#da291c"
            height="4.6"
            rx="0.6"
            width="3.6"
            x="10.2"
            y="8.2"
          />
          <rect fill="#ffffff" height="2.6" rx="0.4" width="2" x="11" y="9.2" />
        </>
      ) : (
        <>
          <rect fill="#b22234" height="21" width="30" />
          {US_STRIPES.map((stripe) => (
            <rect
              fill="#ffffff"
              height="1.615"
              key={stripe}
              width="30"
              y={stripe * 1.615}
            />
          ))}
          <rect fill="#3c3b6e" height="11.3" width="12" />
          {[2, 5, 8].flatMap((y) =>
            [2, 6, 10].map((x) => (
              <circle
                cx={x}
                cy={y + 0.4}
                fill="#ffffff"
                key={`${x}-${y}`}
                r="0.7"
              />
            )),
          )}
        </>
      )}
    </svg>
  );
}
