import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Ticket, Boxes, BarChart3,
  Image as ImageIcon, Star, Undo2, Gift, Mail, LogOut, Menu, X, Sun, Moon,
  User, Settings, KeyRound, ChevronDown, Receipt, UserCog, FileText,
  PanelLeftClose, PanelLeft, Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import Logo from '../components/Logo';

// Grouped navigation sections
const NAV_GROUPS = [
  {
    label: 'OVERVIEW',
    items: [
      ['/admin', LayoutDashboard, 'Dashboard', true],
    ],
  },
  {
    label: 'STORE',
    items: [
      ['/admin/products', Package, 'Products'],
      ['/admin/categories', Tags, 'Categories'],
      ['/admin/inventory', Boxes, 'Inventory'],
      ['/admin/banners', ImageIcon, 'Banners'],
    ],
  },
  {
    label: 'SALES',
    items: [
      ['/admin/orders', ShoppingCart, 'Orders'],
      ['/admin/billing', Receipt, 'Billing'],
      ['/admin/invoices', FileText, 'Invoices'],
      ['/admin/returns', Undo2, 'Returns'],
      ['/admin/coupons', Ticket, 'Coupons'],
    ],
  },
  {
    label: 'CUSTOMERS',
    items: [
      ['/admin/customers', Users, 'Customers'],
      ['/admin/reviews', Star, 'Reviews'],
      ['/admin/loyalty', Gift, 'Loyalty'],
      ['/admin/messages', Mail, 'Messages'],
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      ['/admin/cashiers', UserCog, 'Cashiers'],
      ['/admin/reports', BarChart3, 'Reports'],
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/'); };

  // Close account dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
        setSearchQuery('');
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Search: flatten all nav items for filtering
  const allNavItems = NAV_GROUPS.flatMap((g) => g.items.map(([to, , label]) => ({ to, label })));
  const filteredItems = searchQuery.trim()
    ? allNavItems.filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Get breadcrumb from current path
  const currentItem = allNavItems.find((n) => {
    if (n.to === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(n.to);
  });
  const breadcrumb = currentItem?.label || 'Dashboard';

  const ACCOUNT_LINKS = [
    ['/profile?tab=profile', User, 'Profile'],
    ['/admin/settings', Settings, 'Settings'],
    ['/profile?tab=password', KeyRound, 'Change Password'],
  ];

  const Sidebar = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link to="/admin" className={`flex items-center py-5 ${collapsed ? 'justify-center px-2' : 'gap-2 px-6'}`}>
        <Logo className={collapsed ? 'h-7 w-7 min-w-[28px]' : 'h-11'} />
      </Link>

      {/* Nav groups */}
      <nav className={`flex-1 space-y-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={collapsed ? 'mb-1' : 'mb-2'}>
            {!collapsed && (
              <p className="mb-1 mt-4 px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 first:mt-0">
                {group.label}
              </p>
            )}
            {collapsed && <div className="my-2 mx-2 border-t border-white/10" />}
            {group.items.map(([to, Icon, label, end]) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'nav-accent-active bg-gold/15 text-gold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  } ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'}`
                }
                title={collapsed ? label : undefined}
              >
                <Icon size={collapsed ? 22 : 18} className="shrink-0" />
                {!collapsed && label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-white/10 ${collapsed ? 'p-2' : 'p-4'}`}>
        {!collapsed && (
          <Link to="/" className="block px-2 py-1.5 text-sm text-gray-400 hover:text-gold">← View Store</Link>
        )}
        <button onClick={handleLogout} className={`flex items-center text-sm text-rose-400 hover:text-rose-300 ${collapsed ? 'justify-center w-full rounded-xl p-2.5 hover:bg-rose-500/10' : 'mt-1 gap-2 px-2 py-1.5'}`}
          title={collapsed ? 'Logout' : undefined}>
          <LogOut size={collapsed ? 22 : 16} /> {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 text-ink dark:bg-ink dark:text-gray-100">
      {/* Desktop sidebar */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 self-start overflow-y-auto bg-ink text-white transition-all duration-300 lg:block ${collapsed ? 'w-20' : 'w-64'}`}>
        {Sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-ink text-white">{Sidebar}</aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 px-4 py-3 dark:border-white/10 lg:px-8">
          {/* Mobile menu button */}
          <button className="-ml-1 p-1 lg:hidden" onClick={() => setOpen(true)} aria-label="menu"><Menu /></button>

          {/* Mobile logo */}
          <Link to="/admin" className="lg:hidden">
            <Logo className="h-9" />
          </Link>

          {/* Desktop: collapse toggle + breadcrumb */}
          <button onClick={() => setCollapsed((c) => !c)} className="hidden rounded-lg p-1.5 text-gray-400 transition hover:bg-gold/10 hover:text-gold lg:block" title="Toggle sidebar">
            {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm text-gray-400">Admin</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold">{breadcrumb}</span>
          </div>

          {/* Right side actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {/* Search */}
            <div className="relative" ref={searchRef}>
              <button onClick={() => { setSearchOpen((o) => !o); setSearchQuery(''); }}
                className="hidden items-center gap-2 rounded-xl border border-black/10 px-3 py-1.5 text-sm text-gray-400 transition hover:border-gold/30 hover:text-gold dark:border-white/10 sm:flex">
                <Search size={15} />
                <span className="hidden md:inline">Search...</span>
                <kbd className="ml-2 hidden rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 dark:bg-white/10 md:inline">⌘K</kbd>
              </button>
              {/* Mobile search icon */}
              <button onClick={() => { setSearchOpen((o) => !o); setSearchQuery(''); }}
                className="rounded-full p-2 hover:bg-gold/10 sm:hidden" aria-label="search">
                <Search size={18} />
              </button>

              {searchOpen && (
                <div className="fixed inset-x-3 top-16 z-[70] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
                  <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-glass dark:border-white/10 dark:bg-ink-soft">
                    <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10">
                      <Search size={16} className="text-gray-400" />
                      <input
                        type="text" autoFocus value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search pages..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      />
                      <kbd className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] text-gray-400 dark:bg-white/10">ESC</kbd>
                    </div>
                    {searchQuery.trim() && (
                      <div className="max-h-64 overflow-y-auto p-2">
                        {filteredItems.length === 0 ? (
                          <p className="px-3 py-4 text-center text-sm text-gray-400">No results found</p>
                        ) : (
                          filteredItems.map((item) => (
                            <Link key={item.to} to={item.to}
                              onClick={() => setSearchOpen(false)}
                              className="block rounded-xl px-3 py-2 text-sm transition hover:bg-gold/10">
                              {item.label}
                            </Link>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark font-bold text-ink">
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
