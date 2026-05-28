/**
 * Animated success checkmark used at the top of the success screen. The
 * stroke-dasharray draw is opt-in via the `motion-safe:` variant — when the
 * user has `prefers-reduced-motion: reduce`, Tailwind drops the class and
 * we render a static check instead. No JS animation: keeps the bundle lean
 * and lets the browser handle the reduce-motion preference natively.
 */
export function CheckAnim() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width={64}
      height={64}
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-emerald-500"
    >
      <circle cx="32" cy="32" r="28" className="opacity-20" />
      <path
        d="M20 33 L29 42 L46 24"
        className="motion-safe:animate-[draw_600ms_ease-out_forwards] motion-safe:[stroke-dasharray:48] motion-safe:[stroke-dashoffset:48]"
      />
    </svg>
  );
}
