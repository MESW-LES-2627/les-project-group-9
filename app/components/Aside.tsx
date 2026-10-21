import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useState,
} from 'react';
import {Icon} from '~/components/Icon';

type AsideType = 'search' | 'cart' | 'mobile' | 'closed';
type AsideContextValue = {
  type: AsideType;
  open: (mode: AsideType) => void;
  close: () => void;
};

export function Aside({
  children,
  heading,
  type,
}: {
  children?: React.ReactNode;
  type: Exclude<AsideType, 'closed'>;
  heading: React.ReactNode;
}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;
  const id = useId();
  const isSearch = type === 'search';

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [close, expanded]);

  return (
    <div
      aria-hidden={!expanded}
      aria-labelledby={id}
      aria-modal={expanded || undefined}
      className={`fixed inset-0 z-[70] transition-[visibility,opacity] duration-300 ${
        expanded
          ? 'visible bg-ink/25 opacity-100'
          : 'invisible pointer-events-none bg-transparent opacity-0'
      }`}
      role="dialog"
    >
      <button
        aria-label="Close panel"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={close}
        type="button"
      />
      <aside
        className={`absolute bg-cream shadow-stack transition-transform duration-500 ease-jewel ${
          isSearch
            ? `inset-x-0 top-0 h-dvh w-full ${expanded ? 'translate-y-0' : '-translate-y-full'}`
            : `right-0 top-0 h-dvh w-[min(420px,100vw)] ${expanded ? 'translate-x-0' : 'translate-x-full'}`
        }`}
      >
        <header className="flex h-16 items-center justify-between border-b border-line px-5 sm:px-8">
          <h2
            className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-primary"
            id={id}
          >
            {heading}
          </h2>
          <button
            aria-label="Close"
            className="grid size-11 place-items-center text-primary hover:text-ink"
            onClick={close}
            type="button"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="h-[calc(100dvh-4rem)] overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

const AsideContext = createContext<AsideContextValue | null>(null);

Aside.Provider = function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');

  return (
    <AsideContext.Provider
      value={{type, open: setType, close: () => setType('closed')}}
    >
      {children}
    </AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) throw new Error('useAside must be used within an AsideProvider');
  return aside;
}
