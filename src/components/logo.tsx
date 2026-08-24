// Eenvoudig monogram — plek voor een echt merk-icoon later.
export function GezinsappLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="38" height="38" rx="11" fill="currentColor" fillOpacity="0.12" />
      <path d="M20 8 L32 17.5 V32 H24 V23 H16 V32 H8 V17.5 Z" fill="currentColor" />
    </svg>
  );
}
