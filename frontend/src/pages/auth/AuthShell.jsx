import { Link } from 'react-router-dom';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[calc(100vh-3rem)] lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200" alt=""
          className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
        <div className="absolute bottom-12 left-12 text-white">
          <Link to="/" className="font-display text-3xl font-bold">Cloud<span className="text-gold">Fashion</span></Link>
          <p className="mt-3 max-w-sm text-gray-300">Premium fashion, curated for the modern wardrobe.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 block text-center font-display text-2xl font-bold lg:hidden">
            Cloud<span className="text-gold">Fashion</span>
          </Link>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-gray-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-gray-400">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
