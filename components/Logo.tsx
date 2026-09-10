export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tpl-bg2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8A33D" />
          <stop offset="1" stopColor="#C4471F" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#tpl-bg2)" />
      <rect x="1.2" y="1.2" width="37.6" height="37.6" rx="8.8" stroke="white" strokeOpacity="0.18" />
      {/* "27" monogram — the batch identity, set in a clean geometric numeral */}
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', ui-sans-serif, sans-serif"
        fontWeight="800"
        fontSize="17"
        fill="#12151C"
        letterSpacing="-0.5"
      >
        27
      </text>
      <path d="M8 32.5C11 30 15 29 20 29C25 29 29 30 32 32.5" stroke="#12151C" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
