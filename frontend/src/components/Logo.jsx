/**
 * Fork & Finance mark: a fork whose right side forms an "F" arm and an
 * upward-trending finance arrow. Inherits color via `currentColor`.
 */
export default function Logo({ className = "" }) {
  return (
    <svg
      viewBox="0 0 120 130"
      role="img"
      aria-label="Fork & Finance"
      className={className}
      fill="currentColor"
    >
      {/* Fork tines */}
      <g>
        <rect x="30" y="8" width="6" height="44" rx="3" />
        <rect x="42" y="8" width="6" height="44" rx="3" />
        <rect x="54" y="8" width="6" height="44" rx="3" />
        <rect x="66" y="8" width="6" height="44" rx="3" />
      </g>
      {/* Neck joining the tines */}
      <path d="M30 46h42v8a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8z" />
      {/* Handle */}
      <rect x="45" y="58" width="12" height="64" rx="6" />

      {/* Top arm of the "F" */}
      <path d="M78 64h26a4 4 0 0 1 0 14H78a4 4 0 0 1 0-14z" />

      {/* Upward finance arrow (lower arm of the "F") */}
      <path
        d="M75 104c14-1 25-6 33-15"
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path d="M98 78l16 2-7 15z" />
    </svg>
  );
}
