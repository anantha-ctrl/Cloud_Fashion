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
            <p className="mt-8 max-w-md text-lg leading-relaxed text-luxe-ink/70 dark:text-white/70">
              We blend old-world craftsmanship with modern silhouettes — each piece cut, stitched and finished
              to feel personal. No fast fashion. No noise. Just clothes that carry intention.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <div className="mt-10 flex flex-wrap gap-10">
              {[['12k+', 'Happy wardrobes'], ['100%', 'Ethically made'], ['4.9★', 'Average rating']].map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-3xl font-bold text-luxe-ink dark:text-white">{n}</p>
                  <p className="mt-1 text-sm text-luxe-ink/50 dark:text-white/50">{l}</p>
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
