import { useStore } from '../context/StoreContext';

/**
 * Brand logo.
 *  - When an admin has uploaded a store logo (Settings → Brand), show it as-is.
 *  - Otherwise fall back to the bundled gold monogram PNG. It's already gold and
 *    reads well on both light and dark surfaces, so it is never colour-inverted
 *    (inverting gold would turn it blue).
 */
export default function Logo({ className = 'h-10' }) {
  const { logo, name } = useStore();
  const src = logo || '/logo.png';

  return <img src={src} alt={name || 'Novo Clothing'} className={`w-auto object-contain ${className}`} />;
}
