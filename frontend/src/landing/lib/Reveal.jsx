import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

/** Fade / slide-up on scroll into view. Reusable across every section. */
export default function Reveal({ children, delay = 0, y = 44, duration = 0.85, once = true, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Text-mask reveal: each line wipes up from behind a clip. Pass an array of
 * lines. Used for the hero + editorial headlines.
 */
export function MaskReveal({ lines = [], className = '', lineClassName = '', delay = 0, stagger = 0.1 }) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className={`block ${lineClassName}`}
            initial={{ y: '100%', opacity: 0 }}
            whileInView={{ y: '0%', opacity: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: delay + i * stagger, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
