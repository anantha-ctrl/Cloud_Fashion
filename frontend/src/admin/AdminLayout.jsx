import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Ticket, Boxes, BarChart3,
  Image as ImageIcon, Star, Undo2, Gift, Mail, LogOut, Menu, X, Sun, Moon,
  User, Settings, KeyRound, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import Logo from '../components/Logo';

const NAV = [
  ['/admin', LayoutDashboard, 'Dashboard', true],
  ['/admin/products', Package, 'Products'],
  ['/admin/categories', Tags, 'Categories'],
  ['/admin/orders', ShoppingCart, 'Orders'],
  ['/admin/returns', Undo2, 'Returns'],
  ['/admin/inventory', Boxes, 'Inventory'],
  ['/admin/customers', Users, 'Customers'],
  ['/admin/coupons', Ticket, 'Coupons'],
  ['/admin/banners', ImageIcon, 'Banners'],
  ['/admin/reviews', Star, 'Reviews'],
  ['/admin/loyalty', Gift, 'Loyalty'],
  ['/admin/messages', Mail, 'Messages'],
  ['/admin/reports', BarChart3, 'Reports'],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/'); };

  // Close the account dropdown when clicking outside it.
  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const ACCOUNT_LINKS = [
    ['/profile?tab=profile', User, 'Profile'],
    ['/admin/settings', Settings, 'Settings'],
    ['/profile?tab=password', KeyRound, 'Change Password'],
  ];

  const Sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-2 px-6 py-5">
        <Logo white className="h-11" />
      </Link>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(([to, Icon, label, end]) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-gold/15 text-gold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <Link to="/" className="block px-2 py-1.5 text-sm text-gray-400 hover:text-gold">← View Store</Link>
        <button onClick={handleLogout} className="mt-1 flex items-center gap-2 px-2 py-1.5 text-sm text-rose-400 hover:text-rose-300">
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 text-ink dark:bg-ink dark:text-gray-100">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 self-start overflow-y-auto bg-ink text-white lg:block">{Sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-ink text-white">{Sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 px-4 py-3 dark:border-white/10 lg:px-8">
          <button className="-ml-1 p-1 lg:hidden" onClick={() => setOpen(true)} aria-label="menu"><Menu /></button>

          {/* Brand wordmark — matches the storefront header (shown on mobile, where the sidebar is hidden) */}
          <Link to="/admin" className="lg:hidden">
            <Logo className="h-9" />
          </Link>
          <h1 className="hidden font-display text-lg font-semibold lg:block">Admin Panel</h1>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <Link to="/" className="hidden rounded-full px-3 py-1.5 text-sm text-gray-500 transition hover:text-gold dark:text-gray-400 sm:inline-flex">
              View Store
            </Link>
            <NotificationBell />
            <button onClick={toggle} className="rounded-full p-2 hover:bg-gold/10" aria-label="theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative pl-1" ref={menuRef}>
              <button onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-gold/10">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-bold text-ink">
                  {user?.name?.[0]}
                </div>
                <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
                <ChevronDown size={16} className={`hidden text-gray-400 transition sm:block ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="card absolute right-0 top-full mt-2 w-52 overflow-hidden p-1.5 text-sm shadow-xl">
                  <div className="border-b border-black/5 px-3 py-2 dark:border-white/10">
                    <p className="font-semibold">{user?.name}</p>
                    <p className="truncate text-xs text-gray-400">{user?.email}</p>
                  </div>
                  {ACCOUNT_LINKS.map(([to, Icon, label]) => (
                    <Link key={label} to={to} onClick={() => setMenuOpen(false)}
                      className="mt-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-gold/10">
                      <Icon size={16} className="text-gray-400" /> {label}
                    </Link>
                  ))}
                  <button onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-rose-500 transition hover:bg-rose-500/10">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
