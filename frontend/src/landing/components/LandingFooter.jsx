import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, ArrowUpRight } from 'lucide-react';
import Logo from '../../components/Logo';

const COLS = [
  ['Company', [['About', '/about'], ['Collections', '/shop'], ['New Arrivals', '/shop'], ['Best Sellers', '/shop']]],
  ['Support', [['Contact', '/contact'], ['Orders', '/orders'], ['Wishlist', '/wishlist'], ['FAQ', '/contact']]],
  ['Policies', [['Privacy', '/privacy'], ['Terms', '/terms'], ['Returns', '/orders'], ['Shipping', '/shop']]],
];

const SOCIALS = [
  [Instagram, 'https://www.instagram.com/n.o.v.o_clothing'],
  [Facebook, '#'],
  [Twitter, '#'],
];

export default function LandingFooter() {
  return (
    <footer className="bg-luxe-ink text-white">
      <div className="mx-auto max-w-[1400px] px-6 py-20 sm:px-10 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Logo white className="h-12" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/60">
              Editorial fashion, crafted in India. We don't sell clothes — we create confidence.
            </p>
            <div className="mt-6 flex gap-3">
              {SOCIALS.map(([Icon, href], i) => (
                <a key={i} href={href} target="_blank" rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition hover:border-luxe-gold hover:bg-luxe-gold hover:text-luxe-ink">
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {COLS.map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs uppercase tracking-[0.3em] text-luxe-gold">{title}</h4>
              <ul className="mt-5 space-y-3">
                {links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="group inline-flex items-center gap-1 text-sm text-white/70 transition hover:text-white">
                      {label}
                      <ArrowUpRight size={13} className="opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Nova Clothing. All rights reserved.</p>
          <p>Designed and Developed By <a href="https://cloudhawk.in/">CloudHawk</a>.</p>
        </div>
      </div>
    </footer>
  );
}
