import {useMemo} from 'react';
import {encode} from 'uqr';

type QrCodeProps = {
  /** Text encoded in the code (usually an absolute URL). */
  value: string;
  /** Accessible name for the image. */
  label: string;
  className?: string;
};

/**
 * QR code rendered as inline SVG. The encoder (`uqr`, MIT) runs locally, so
 * the link is never sent to a third-party QR service.
 */
export function QrCode({value, label, className = ''}: QrCodeProps) {
  const {data, size} = useMemo(
    () => encode(value, {ecc: 'M', border: 2}),
    [value],
  );

  const modules: Array<{x: number; y: number}> = [];

  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) modules.push({x, y});
    });
  });

  return (
    <svg
      aria-label={label}
      className={className}
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#ffffff" height={size} width={size} />
      <g fill="#111111">
        {modules.map((module) => (
          <rect
            height={1}
            key={`${module.x}-${module.y}`}
            width={1}
            x={module.x}
            y={module.y}
          />
        ))}
      </g>
    </svg>
  );
}
