import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Reveal from '../lib/Reveal';
import Tilt3D from '../lib/Tilt3D';
import api from '../../api/client';
import { CATEGORIES } from '../lib/content';

// Hardcoded editorial set as a graceful fallback if the API is unreachable.
const FALLBACK = CATEGORIES.map((c) => ({ name: c.name, to: c.to, img: c.img }));

export default function CategorySection() {
  const [cats, setCats] = useState(null);
  const trackRef = useRef(null);
  const hover = useRef(false);
  const reduce = useReducedMotion();

  // Live categories from the DB (admin-managed under Admin → Categories).
  useEffect(() => {
    api.get('/api/categories')
      .then((r) => {
        const list = (r.data.data || []).map((c) => ({
          name: c.name,
          to: `/category/${c.slug}`,
          img: c.image_url,
          count: c.product_count,
        }));
        setCats(list.length ? list : FALLBACK);
      })
      .catch(() => setCats(FALLBACK));
  }, []);

  const scrollByCards = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const amount = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  // Auto-advance slide-wise; loop back at the end; pause on hover.
  useEffect(() => {
    if (reduce || !cats || cats.length < 3) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el || hover.current) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollByCards(1);
      }
    }, 3200);
    return () => clearInterval(id);
  }, [reduce, cats]);

  const items = cats || FALLBACK;

  return (
    <section className="bg-luxe-bg py-24 dark:bg-ink sm:py-28">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-12">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Reveal><p className="mb-4 text-xs uppercase tracking-[0.4em] text-luxe-bronze">Explore</p></Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-display text-4xl font-bold text-luxe-ink dark:text-white sm:text-5xl">Shop by category</h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="flex items-center gap-3">
              {/* slider controls */}
              <button onClick={() => scrollByCards(-1)} aria-label="Previous categories"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-luxe-ink/15 text-luxe-ink transition hover:border-luxe-gold hover:bg-luxe-gold hover:text-luxe-ink dark:border-white/20 dark:text-white">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => scrollByCards(1)} aria-label="Next categories"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-luxe-ink/15 text-luxe-ink transition hover:border-luxe-gold hover:bg-luxe-gold hover:text-luxe-ink dark:border-white/20 dark:text-white">
                <ChevronRight size={18} />
              </button>
              <Link to="/shop" className="group ml-2 inline-flex items-center gap-2 text-sm font-semibold text-luxe-ink dark:text-white">
                View all
                <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Sliding track */}
        <div
          ref={trackRef}
          onMouseEnter={() => { hover.current = true; }}
          onMouseLeave={() => { hover.current = false; }}
          className="scrollbar-none -mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-2 pb-2"
        >
          {items.map((c) => (
            <Tilt3D
              key={c.name}
              data-card
              max={9}
              glare
              className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[30.5%] xl:w-[23.5%]"
            >
              <Link
                to={c.to}
                className="group relative block aspect-[4/5] overflow-hidden rounded-luxe"
              >
                <img
                  src={c.img} alt={c.name} loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-luxe-ink/75 via-luxe-ink/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5" style={{ transform: 'translateZ(40px)' }}>
                  <div>
                    <span className="font-display text-2xl font-semibold text-white">{c.name}</span>
                    {c.count != null && <p className="mt-0.5 text-xs text-white/70">{c.count} products</p>}
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition group-hover:bg-luxe-gold group-hover:text-luxe-ink">
                    <ArrowUpRight size={18} />
                  </span>
                </div>
              </Link>
            </Tilt3D>
          ))}
        </div>
      </div>
    </section>
  );
}
