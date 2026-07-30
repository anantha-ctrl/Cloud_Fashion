import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Reveal, { MaskReveal } from '../lib/Reveal';
import { IMG } from '../lib/content';

export default function BrandIntro({ image }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section ref={ref} className="relative overflow-hidden bg-luxe-bg py-24 dark:bg-ink sm:py-32 lg:py-40">
      <div className="mx-auto grid max-w-[1400px] items-center gap-14 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:px-12">
        <div>
          <Reveal>
            <p className="mb-6 text-xs uppercase tracking-[0.4em] text-luxe-bronze">Our Philosophy</p>
          </Reveal>
          <h2 className="font-display text-4xl font-bold leading-[1.05] text-luxe-ink dark:text-white sm:text-6xl">
            <MaskReveal lines={['Designed in India.']} />
            <span className="text-luxe-bronze"><MaskReveal lines={['Made for everyone.']} delay={0.12} /></span>
          </h2>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-luxe-ink/80 dark:text-white/80">
              We blend old-world craftsmanship with modern silhouettes — each piece cut, stitched and finished
              to feel personal. No fast fashion. No noise. Just clothes that carry intention.
            </p>
          </Reveal>

          {/* Core Brand Pillars - Fills empty space with rich feature cards */}
          <Reveal delay={0.2}>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-black/5 bg-white/50 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <span className="text-xl">🧵</span>
                <h4 className="mt-2 text-sm font-bold text-luxe-ink dark:text-white">Long-Staple Weave</h4>
                <p className="mt-1 text-xs text-luxe-ink/60 dark:text-white/60">Ultra-soft 100% breathable cotton & linen</p>
              </div>
              <div className="rounded-xl border border-black/5 bg-white/50 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <span className="text-xl">✂️</span>
                <h4 className="mt-2 text-sm font-bold text-luxe-ink dark:text-white">Master Tailoring</h4>
                <p className="mt-1 text-xs text-luxe-ink/60 dark:text-white/60">Hand-finished seams for flawless drape</p>
              </div>
              <div className="rounded-xl border border-black/5 bg-white/50 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <span className="text-xl">🌿</span>
                <h4 className="mt-2 text-sm font-bold text-luxe-ink dark:text-white">Eco-Conscious</h4>
                <p className="mt-1 text-xs text-luxe-ink/60 dark:text-white/60">Zero-fade skin-safe organic pigments</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-luxe-bronze/20 bg-gold/5 p-6">
              {[
                ['12k+', 'Happy Wardrobes'],
                ['100%', 'Ethically Sourced'],
                ['4.9★', 'Average Rating'],
              ].map(([n, l]) => (
                <div key={l} className="text-center sm:text-left">
                  <p className="font-display text-3xl font-bold text-luxe-ink dark:text-white">{n}</p>
                  <p className="mt-0.5 text-xs font-medium text-luxe-bronze uppercase tracking-wider">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="relative">
          <div className="relative overflow-hidden rounded-luxe-lg shadow-luxe">
            <motion.img style={{ y }} src={image || IMG.intro} alt="Novo Clothing craftsmanship"
              className="aspect-[4/5] w-full scale-110 object-cover" />
          </div>
          {/* floating accent card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="absolute -bottom-6 -left-4 rounded-luxe bg-white/80 p-5 backdrop-blur-xl shadow-luxe-sm dark:bg-ink-soft/90 sm:-left-8"
          >
            <p className="font-display text-lg text-luxe-ink dark:text-white">Slow-made</p>
            <p className="text-sm text-luxe-ink/50 dark:text-white/50">Crafted, not churned</p>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
