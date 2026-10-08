export function Logo({ size = 32, night = false }: { size?: number; night?: boolean }) {
  const ink = night ? "#fbfcf9" : "#07110e";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="SecondLook logo" role="img">
      <rect x="6" y="6" width="34" height="34" fill="none" stroke="#35d5b4" strokeWidth="5" />
      <rect x="24" y="24" width="34" height="34" fill={ink} stroke="#35d5b4" strokeWidth="5" />
      <circle cx="41" cy="41" r="7.5" fill="#35d5b4" />
      <circle cx="43.5" cy="38.5" r="2.4" fill={ink} />
    </svg>
  );
}
