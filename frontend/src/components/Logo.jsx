/**
 * Cloud Fashion brand logo (CF monogram lockup).
 * The source PNG is black artwork, so:
 *   - default: inverts to white only in dark mode (`dark:invert`)
 *   - white:   forces white (use on always-dark surfaces like the footer / admin sidebar)
 */
export default function Logo({ className = 'h-10', white = false }) {
  return (
    <img
      src="/logo.png"
      alt="Cloud Fashion"
      className={`w-auto object-contain ${white ? 'invert' : 'dark:invert'} ${className}`}
    />
  );
}
