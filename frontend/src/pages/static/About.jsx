export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Our Story</p>
      <h1 className="mt-2 font-display text-4xl font-bold">About Cloud Fashion</h1>
      <div className="mt-8 space-y-5 leading-relaxed text-gray-500 dark:text-gray-300">
        <p>Cloud Fashion was born from a simple belief: premium style should feel effortless. We curate
          collections that blend timeless craftsmanship with contemporary design — pieces made to be worn,
          loved, and remembered.</p>
        <p>From tailored menswear to flowing womenswear, playful kids' styles, statement footwear and refined
          accessories, every product in our store is selected for quality, fit, and character.</p>
        <p>We're a single-vendor boutique with a big heart — obsessed with detail, committed to sustainability,
          and dedicated to making your shopping experience as elegant as the clothes themselves.</p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[['50k+', 'Happy Customers'], ['1200+', 'Curated Styles'], ['4.8★', 'Average Rating']].map(([n, l]) => (
          <div key={l} className="card p-6 text-center">
            <p className="font-display text-3xl font-bold text-gold">{n}</p>
            <p className="mt-1 text-sm text-gray-400">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
