export default function LegalPage({ eyebrow, title, sections }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-gray-400">Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
      <div className="mt-10 space-y-8">
        {sections.map(([heading, body], i) => (
          <section key={i}>
            <h2 className="text-xl font-semibold">{i + 1}. {heading}</h2>
            <p className="mt-2 leading-relaxed text-gray-500 dark:text-gray-300">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
