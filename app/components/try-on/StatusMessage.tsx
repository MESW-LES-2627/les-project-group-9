type StatusMessageProps = {
  message: string | null;
  tone?: 'info' | 'error';
};

/**
 * Polite live region for camera and upload status. Always rendered so screen
 * readers announce changes without a layout shift.
 */
export function StatusMessage({message, tone = 'info'}: StatusMessageProps) {
  return (
    <p
      aria-live="polite"
      className={
        tone === 'error'
          ? 'text-xs font-medium leading-6 text-ink'
          : 'text-xs leading-6 text-primary'
      }
      role="status"
    >
      {message ?? ''}
    </p>
  );
}
