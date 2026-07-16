interface MascotProps {
  size?: number;
  className?: string;
}

export function Mascot({ size = 140, className = "" }: MascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="어디있을까? 캐릭터"
      className={className}
    >
      {/* magnifier ring */}
      <circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke="#1E8A82"
        strokeWidth="7"
      />
      <line
        x1="71"
        y1="71"
        x2="96"
        y2="96"
        stroke="#1E8A82"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* pin body */}
      <path
        d="M50 26c-11 0-20 8.4-20 19.3C30 60 50 82 50 82s20-22 20-36.7C70 34.4 61 26 50 26z"
        fill="#F2704F"
      />

      {/* face plate */}
      <circle cx="50" cy="46" r="15" fill="#FFFBF8" />

      {/* eyes */}
      <circle cx="45" cy="45" r="2.6" fill="#2B2320" />
      <circle cx="55" cy="45" r="2.6" fill="#2B2320" />

      {/* blush */}
      <circle cx="40.5" cy="50.5" r="2.4" fill="#F2704F" opacity="0.45" />
      <circle cx="59.5" cy="50.5" r="2.4" fill="#F2704F" opacity="0.45" />

      {/* smile */}
      <path
        d="M44 51c1.8 2.4 4 3.6 6 3.6s4.2-1.2 6-3.6"
        stroke="#2B2320"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* sparkle */}
      <path
        d="M92 30l2.4 5.6L100 38l-5.6 2.4L92 46l-2.4-5.6L84 38l5.6-2.4z"
        fill="#2E9E5B"
      />
    </svg>
  );
}
