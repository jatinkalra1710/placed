export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* boarding-pass ticket mark */}
      <rect x="1" y="6" width="30" height="20" rx="3" stroke="#E8A33D" strokeWidth="2" />
      <circle cx="22" cy="16" r="3" fill="#E8A33D" fillOpacity="0.15" stroke="#E8A33D" strokeWidth="1.5" />
      <path d="M6 12H16" stroke="#E8A33D" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 16H14" stroke="#8A93A6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 20H12" stroke="#8A93A6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 1V6M24 26V31" stroke="#8A93A6" strokeWidth="1.5" strokeDasharray="1 3" strokeLinecap="round" />
    </svg>
  );
}
