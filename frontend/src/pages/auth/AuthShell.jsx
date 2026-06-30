import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Logo from '../../components/Logo';

// Rotating brand panel — fashion imagery + tagline.
const SLIDES = [
  { img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200', text: 'Premium fashion, curated for the modern wardrobe.' },
  { img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200', text: 'New-season arrivals, handpicked for you.' },
  { img: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=1200', text: 'Timeless pieces, crafted with care.' },
];

export default function AuthShell({ title, subtitle, children, footer }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: rotating imagery */}
      <div className="relative hidden overflow-hidden lg:block">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={i}
            src={SLIDES[i].img}
            alt=""
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />

        <div className="absolute inset-x-12 bottom-12 text-white">
          <Link to="/" className="inline-block"><Logo white className="h-16" /></Link>
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-3 max-w-sm text-gray-300"
            >
              {SLIDES[i].text}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* progress dots */}
        <div className="absolute bottom-6 right-12 flex gap-2">
          {SLIDES.map((_, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`}
              className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-gold' : 'w-2 bg-white/40 hover:bg-white/70'}`} />
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div className="relative flex items-center justify-center px-6 py-12">
        <Link
          to="/"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-gray-500 transition hover:border-gold hover:text-gold dark:border-white/10 dark:text-gray-300"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="mb-8 flex justify-center lg:hidden">
            <Logo className="h-12" />
          </Link>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-gray-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-gray-400">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}
