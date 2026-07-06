import { useStore } from '../context/StoreContext';

/**
 * Brand logo.
 *  - When an admin has uploaded a store logo (Settings → Brand), show it as-is.
 *  - Otherwise fall back to the bundled monogram PNG (black artwork), which
 *    inverts to white in dark mode / on always-dark surfaces (footer, sidebar).
 */
export default function Logo({ className = 'h-10', white = false }) {
  const { logo, name } = useStore();

  if (logo) {
    return <img src={logo} alt={name || 'Logo'} className={`w-auto object-contain ${className}`} />;
  }
  return (
    <img
      src="/logo.png"
      alt={name || 'Nova Clothing'}
      className={`w-auto object-contain ${white ? 'invert' : 'dark:invert'} ${className}`}
    />
  );
}
