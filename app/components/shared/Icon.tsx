export type IconName =
  | 'arrow'
  | 'bag'
  | 'camera'
  | 'check'
  | 'chevron'
  | 'close'
  | 'heart'
  | 'hanger'
  | 'menu'
  | 'qr'
  | 'search'
  | 'sparkle'
  | 'user';

interface IconProps {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string;
}

export function Icon({name, size = 21, filled = false, className}: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    bag: (
      <>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    camera: (
      <>
        <path d="M4 19V8h4l1.5-2h5L16 8h4v11H4Z" />
        <circle cx="12" cy="13.5" r="3.5" />
      </>
    ),
    check: <path d="m5 12.5 4.5 4.5L19 7" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    hanger: (
      <>
        <path d="M9 6.5C9 5.5 10 4 11.5 4C13 4 14 5.5 14 6.5C14 7.5 12.5 9 12 10" />
        <path d="M12 10L3.00001 16.5C2.10001 17.3 2.70001 19.2 3.90001 19.2H20.1C21.3 19.2 21.9 17.3 21 16.5L12 10Z" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    qr: (
      <>
        <rect height="6" rx="1" width="6" x="4" y="4" />
        <rect height="6" rx="1" width="6" x="14" y="4" />
        <rect height="6" rx="1" width="6" x="4" y="14" />
        <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
        <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
