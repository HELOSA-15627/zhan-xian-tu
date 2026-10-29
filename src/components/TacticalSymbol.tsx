import type { TacticalSymbol as TacticalSymbolName } from "../model/types";

type TacticalSymbolProps = {
  symbol: TacticalSymbolName;
  color: string;
  size: number;
};

export function TacticalSymbol({
  symbol,
  color,
  size,
}: TacticalSymbolProps) {
  const line = "#0b0d12";
  const strokeWidth = 2.1;

  return (
    <svg
      aria-hidden="true"
      className="tactical-symbol"
      height={size}
      viewBox="-20 -20 40 40"
      width={size}
    >
      <g
        fill={color}
        stroke={line}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      >
        {symbol === "friendly" ? (
          <>
            <path d="M-12 -8 H5 L13 0 L5 8 H-12 Z" />
            <path d="M-4 -3 H4 L8 0 L4 3 H-4 Z" fill="none" />
          </>
        ) : null}
        {symbol === "hostile" ? (
          <>
            <path d="M0 -13 L13 0 L0 13 L-13 0 Z" />
            <path d="M-6 0 H6 M0 -6 V6" fill="none" />
          </>
        ) : null}
        {symbol === "headquarters" ? (
          <>
            <rect x="-11" y="-9" width="22" height="18" rx="1.5" />
            <path d="M-5 -2 V-11 L5 -7 V-2 Z" fill={line} />
            <path d="M-5 -11 V7" fill="none" />
          </>
        ) : null}
        {symbol === "defense" ? (
          <>
            <path d="M-14 8 Q0 -16 14 8" fill="none" strokeWidth="4" />
            <path d="M-9 10 Q0 -7 9 10" fill="none" />
            <path d="M-13 11 H13" fill="none" strokeDasharray="3 3" />
          </>
        ) : null}
        {symbol === "nest" ? (
          <>
            <circle cx="0" cy="0" r="12" fill="none" strokeWidth="3" />
            <circle cx="0" cy="0" r="6" />
            <path
              d="M0 -17 V-13 M0 13 V17 M-17 0 H-13 M13 0 H17"
              fill="none"
            />
          </>
        ) : null}
        {symbol === "objective" ? (
          <>
            <circle cx="0" cy="0" r="12" fill="none" strokeWidth="2" />
            <circle cx="0" cy="0" r="5" />
            <path
              d="M0 -17 V-9 M0 9 V17 M-17 0 H-9 M9 0 H17"
              fill="none"
            />
          </>
        ) : null}
        {symbol === "armor" ? (
          <>
            <rect x="-14" y="-8" width="28" height="16" rx="5" />
            <path d="M-11 -4 H11 M-11 4 H11" fill="none" />
            <path d="M0 -4 V4" fill="none" stroke={line} />
          </>
        ) : null}
        {symbol === "aviation" ? (
          <>
            <path d="M0 -15 L4 -2 L16 8 L8 9 L0 3 L-8 9 L-16 8 L-4 -2 Z" />
            <path d="M0 -10 V3" fill="none" stroke={line} />
          </>
        ) : null}
      </g>
    </svg>
  );
}
