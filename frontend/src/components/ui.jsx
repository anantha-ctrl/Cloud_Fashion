// Small reusable UI primitives.
export const Spinner = ({ className = '' }) => (
  <div className={`flex items-center justify-center py-16 ${className}`}>
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-gold border-t-transparent" />
  </div>
);

export const SectionTitle = ({ eyebrow, title, action }) => (
  <div className="mb-8 flex items-end justify-between">
    <div>
      {eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-gold">{eyebrow}</p>}
      <h2 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{title}</h2>
    </div>
    {action}
  </div>
);

export const Empty = ({ icon: Icon, title, subtitle, children }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    {Icon && <Icon size={48} className="mb-4 text-gold/60" />}
    <h3 className="text-xl font-semibold">{title}</h3>
    {subtitle && <p className="mt-1 text-gray-400">{subtitle}</p>}
    {children && <div className="mt-6">{children}</div>}
  </div>
);

export const Skeleton = () => (
  <div className="card aspect-[3/4] shimmer bg-black/5 dark:bg-white/5" />
);
