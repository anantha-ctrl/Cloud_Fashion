import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import api from '../api/client';
import useLenis from './lib/useLenis';
import { IMG } from './lib/content';

import LandingNav from './components/LandingNav';
import Hero from './components/Hero';
import BrandIntro from './components/BrandIntro';
import CategorySection from './components/CategorySection';
import CollectionShowcase from './components/CollectionShowcase';
import BestSeller from './components/BestSeller';
import FeaturedCollection from './components/FeaturedCollection';
import NewArrival from './components/NewArrival';
import BrandStory from './components/BrandStory';
import InstagramGallery from './components/InstagramGallery';
import Newsletter from './components/Newsletter';
import LandingFooter from './components/LandingFooter';

export default function Landing() {
  useLenis(); // buttery smooth scroll for the whole page
  const [content, setContent] = useState(null); // admin-editable hero + story copy

  // Pull the live, admin-editable landing copy (falls back to built-in defaults).
  useEffect(() => {
    api.get('/api/landing').then((r) => setContent(r.data.data)).catch(() => {});
  }, []);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <div className="relative bg-luxe-bg font-sans text-luxe-ink antialiased dark:bg-ink dark:text-white">
      {/* Scroll progress bar */}
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gold-sheen" />

      <LandingNav />

      <main>
        <Hero content={content} />
        <BrandIntro image={content?.intro_image} />
        <CategorySection />

        {/* Men / Women / Kids — one reusable component, three stories */}
        <CollectionShowcase
          index="01"
          eyebrow="Men"
          title={['Sharp.', 'Effortless.']}
          description="Tailored essentials and elevated staples — built for the man who lets the fit do the talking."
          image={content?.men_image || IMG.men}
          to="/category/men"
          cta="Explore Men"
        />
        <CollectionShowcase
          index="02"
          eyebrow="Women"
          title={['Bold.', 'Graceful.']}
          description="From everyday luxe to statement occasion-wear — silhouettes that move with confidence."
          image={content?.women_image || IMG.women}
          to="/category/women"
          cta="Explore Women"
          reverse
          dark
          accent="text-luxe-gold"
        />
        <CollectionShowcase
          index="03"
          eyebrow="Kids"
          title={['Playful.', 'Premium.']}
          description="Soft, durable and joyfully designed — little wardrobes with big personality."
          image={content?.kids_image || IMG.kids}
          to="/category/kids"
          cta="Explore Kids"
        />

        <BestSeller />
        <FeaturedCollection />
        <NewArrival image={content?.newarrival_image} />
        <BrandStory quote={content?.story_quote} />
        <InstagramGallery />
        <Newsletter />
      </main>

      <LandingFooter />
    </div>
  );
}
