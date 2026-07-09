import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Bar,
  CartesianGrid, Cell, PieChart, Pie, ComposedChart, Area,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee, ShoppingCart, Users, Package, AlertTriangle, RefreshCw,
  TrendingUp, Clock, UserPlus, Receipt, Globe, Store,
  Plus, Eye, FileBarChart, ArrowUpRight, ArrowDownRight,
  ShoppingBag, Star, Activity, Percent,
} from 'lucide-react';
import api from '../api/client';
import { inr, dateFmt, timeAgo, statusColor } from '../utils/format';
import { useAuth } from '../context/AuthContext';

// ── Chart tooltip styles ──
const TOOLTIP = { background: '#15151c', border: '1px solid #c9a96a44', borderRadius: 12 };
const LABEL  = { color: '#ffffff', fontWeight: 600, marginBottom: 2 };
const ITEM   = { color: '#e7d8b6' };

const STATUS_COLORS = {
  pending: '#f59e0b', processing: '#3b82f6', packed: '#6366f1',
  shipped: '#06b6d4', delivered: '#10b981', cancelled: '#f43f5e',
};

const ACTIVITY_ICON = {
  order:    { icon: ShoppingBag, color: 'text-blue-500',    bg: 'bg-blue-500/15' },
  customer: { icon: UserPlus,    color: 'text-emerald-500', bg: 'bg-emerald-500/15' },
  review:   { icon: Star,        color: 'text-amber-500',   bg: 'bg-amber-500/15' },
};

// Greeting based on time of day
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// ── Animated number counter ──
function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = typeof value === 'number' ? value : Number(value) || 0;
    if (from === to) { setDisplay(to); return; }
    prevRef.current = to;

    const duration = 800;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * ease));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <>{prefix}{typeof value === 'number' ? display.toLocaleString('en-IN') : value}{suffix}</>;
}

// ── Skeleton placeholders ──
const SkeletonCard = () => (
  <div className="card shimmer h-[104px] rounded-2xl bg-black/5 dark:bg-white/5" />
);
const SkeletonChart = () => (
  <div className="card shimmer h-[380px] rounded-2xl bg-black/5 dark:bg-white/5" />
);
const SkeletonTable = () => (
  <div className="card shimmer h-[320px] rounded-2xl bg-black/5 dark:bg-white/5" />
);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback((silent) => {
    if (!silent) setData(null);
    setRefreshing(true);
    return api.get('/api/admin/dashboard')
      .then((r) => { setData(r.data.data); setLastUpdated(new Date()); })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => { load(false); }, [load]);

  // Keep the numbers live: poll every 30s, and refresh immediately whenever the
  // admin returns to this tab (e.g. after ringing up a bill) or the network comes
  // back — so a fresh sale shows up at once instead of waiting for the next poll.
  useEffect(() => {
    const t = setInterval(() => load(true), 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [load]);

  // ── Skeleton state ──
  if (!data) {
    return (
      <div className="space-y-6">
        {/* Skeleton welcome */}
        <div className="card shimmer h-[120px] rounded-2xl bg-black/5 dark:bg-white/5" />
        {/* Skeleton KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  const { cards, trends = {}, monthly_sales, status_breakdown, recent_orders, top_products = [], recent_customers = [], activity = [] } = data;

  return (
    <div className="space-y-6">
      {/* ═══════ Welcome Banner ═══════ */}
      <WelcomeBanner
        name={user?.name}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
        onRefresh={() => load(false)}
        pendingOrders={cards.pending_orders}
        todaySales={cards.today_sales}
      />

      {/* ═══════ Primary KPIs ═══════ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard i={0} icon={IndianRupee} label="Total Sales" value={inr(cards.total_sales)} trend={trends.sales} gradient="icon-gradient-emerald" accent="text-emerald-500" />
        <KpiCard i={1} icon={ShoppingCart} label="Total Orders" value={cards.total_orders} trend={trends.orders} gradient="icon-gradient-blue" accent="text-blue-500" />
        <KpiCard i={2} icon={Users} label="Customers" value={cards.total_customers} trend={trends.customers} gradient="icon-gradient-indigo" accent="text-indigo-500" />
        <KpiCard i={3} icon={Package} label="Products" value={cards.total_products} gradient="icon-gradient-gold" accent="text-gold" />
      </div>

      {/* ═══════ Secondary KPIs ═══════ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard i={4} icon={TrendingUp} label="Today's Revenue" value={inr(cards.today_sales)} gradient="icon-gradient-emerald" accent="text-emerald-500" />
        <KpiCard i={5} icon={Clock} label="Pending Orders" value={cards.pending_orders} gradient="icon-gradient-amber" accent="text-amber-500"
          to={cards.pending_orders > 0 ? '/admin/orders' : undefined} pulse={cards.pending_orders > 0} />
        <KpiCard i={6} icon={Receipt} label="Avg Order Value" value={inr(cards.avg_order_value)} gradient="icon-gradient-blue" accent="text-blue-500" />
        <KpiCard i={7} icon={Percent} label="Conversion Rate" value={`${cards.conversion_rate || 0}%`} gradient="icon-gradient-indigo" accent="text-indigo-500" />
      </div>

      {/* ═══════ Sales by channel ═══════ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard i={0} icon={Globe} label="Online Sales" value={inr(cards.online_sales)} gradient="icon-gradient-cyan" accent="text-cyan-500" />
        <KpiCard i={1} icon={Store} label="Counter Sales" value={inr(cards.counter_sales)} gradient="icon-gradient-gold" accent="text-gold" to="/admin/billing" />
        <KpiCard i={2} icon={Receipt} label="Counter Bills" value={cards.counter_bills ?? 0} gradient="icon-gradient-emerald" accent="text-emerald-500" to="/admin/billing" />
        <KpiCard i={3} icon={UserPlus} label="New Customers (7d)" value={cards.new_customers_7d} trend={trends.customers} gradient="icon-gradient-indigo" accent="text-indigo-500" />
      </div>

      {/* ═══════ Low stock alert ═══════ */}
      <AnimatePresence>
        {cards.low_stock > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Link to="/admin/inventory" className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 transition hover:bg-amber-500/15 dark:text-amber-400">
              <AlertTriangle size={20} /> <span className="text-sm font-medium">{cards.low_stock} product(s) low on stock — review inventory</span>
              <ArrowUpRight size={16} className="ml-auto" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Charts Row: Revenue + Status Breakdown ═══════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueChart data={monthly_sales} />
        <StatusDonut data={status_breakdown} total={cards.total_orders} />
      </div>

      {/* ═══════ Top Products + Activity Feed ═══════ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopProducts products={top_products} />
        <ActivityFeed items={activity} />
      </div>

      {/* ═══════ Recent Customers ═══════ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentCustomers customers={recent_customers} />
        {/* Quick Actions Panel */}
        <QuickActions />
      </div>

      {/* ═══════ Recent Orders Table ═══════ */}
      <RecentOrdersTable orders={recent_orders} />
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * WELCOME BANNER
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function WelcomeBanner({ name, refreshing, lastUpdated, onRefresh, pendingOrders, todaySales }) {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-black/5 bg-gradient-to-r from-ink to-ink-soft p-6 text-white shadow-glass dark:border-white/10 sm:p-8"
    >
      {/* Decorative circles */}
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />
      <div className="absolute -bottom-8 right-20 h-24 w-24 rounded-full bg-gold/5 blur-xl" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {greeting()}, <span className="text-gold">{name?.split(' ')[0] || 'Admin'}</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">{today}</p>
          {lastUpdated && (
            <p className="mt-0.5 text-xs text-gray-500">
              Last updated: {timeAgo(lastUpdated.toISOString())}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingOrders > 0 && (
            <Link to="/admin/orders" className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/25">
              <Clock size={14} /> {pendingOrders} Pending
            </Link>
          )}
          <span className="rounded-full bg-gold/15 px-3 py-1.5 text-xs font-medium text-gold">
            Today: {inr(todaySales)}
          </span>
          <button onClick={onRefresh} disabled={refreshing} className="rounded-full bg-white/10 p-2 transition hover:bg-white/15 disabled:opacity-50">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * KPI CARD
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function KpiCard({ i, icon: Icon, label, value, trend, gradient, accent, to, pulse }) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.06 }}
      className={`card card-glow flex items-center gap-4 p-5 ${pulse ? 'ring-2 ring-amber-500/30' : ''}`}
    >
      <div className={`rounded-xl p-3 ${gradient} ${accent}`}>
        <Icon size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-400">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {trend !== undefined && trend !== null && <TrendBadge value={trend} />}
        </div>
      </div>
      {to && <ArrowUpRight size={16} className="shrink-0 text-gray-400" />}
    </motion.div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TREND BADGE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TrendBadge({ value }) {
  if (value === 0) return null;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
      up ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
    }`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(value)}%
    </span>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * REVENUE CHART (Dual: area + bar)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function RevenueChart({ data: raw }) {
  const monthData = useMemo(
    () => raw.map((m) => ({ month: m.month.slice(5), revenue: Number(m.revenue), orders: Number(m.orders), counter: Number(m.counter || 0) })),
    [raw]
  );

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
      className="card p-6 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Revenue (Last 6 Months)</h3>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold" /> Online</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Counter</span>
          <span className="flex items-center gap-1"><span className="h-2 w-5 rounded-sm border border-blue-400/40" /> Orders</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={monthData}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a96a" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#c9a96a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="counterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="month" stroke="#888" fontSize={12} />
          <YAxis yAxisId="left" stroke="#888" fontSize={12} />
          <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP} labelStyle={LABEL} itemStyle={ITEM} formatter={(v, n) => n === 'orders' ? v : inr(v)} />
          <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#c9a96a" strokeWidth={2} fill="url(#revGrad)" name="Online Revenue" />
          <Area yAxisId="left" type="monotone" dataKey="counter" stroke="#10b981" strokeWidth={2} fill="url(#counterGrad)" name="Counter Revenue" />
          <Bar yAxisId="right" dataKey="orders" fill="#3b82f6" opacity={0.3} radius={[4, 4, 0, 0]} barSize={20} name="Orders" />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STATUS DONUT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function StatusDonut({ data: raw, total }) {
  const pieData = useMemo(
    () => raw.map((s) => ({ name: s.status, value: Number(s.count), fill: STATUS_COLORS[s.status] || '#c9a96a' })),
    [raw]
  );

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
      className="card relative p-6">
      <h3 className="mb-4 font-semibold">Orders by Status</h3>
      <div className="relative">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData} dataKey="value" nameKey="name"
              cx="50%" cy="50%" innerRadius={65} outerRadius={110}
              stroke="none" paddingAngle={2}
            >
              {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP} labelStyle={LABEL} itemStyle={ITEM} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="donut-center">
          <p className="text-3xl font-bold">{total}</p>
          <p className="text-xs text-gray-400">Total Orders</p>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {pieData.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
            <span className="capitalize">{s.name}</span>
            <span className="font-medium text-gray-300">{s.value}</span>
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TOP PRODUCTS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TopProducts({ products }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }}
      className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Top Selling Products</h3>
        <Link to="/admin/reports" className="text-sm text-gold transition hover:text-gold-light">Reports →</Link>
      </div>
      {products.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No sales yet</p>
      ) : (
        <div className="space-y-3">
          {products.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
              className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-gold/5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-xs font-bold text-gold">{i + 1}</span>
              <img src={p.image || 'https://via.placeholder.com/48'} alt="" className="h-11 w-9 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-gray-400">{p.units_sold} sold · {inr(p.revenue)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ACTIVITY FEED
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ActivityFeed({ items }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}
      className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Activity size={18} className="text-gold" />
        <h3 className="font-semibold">Recent Activity</h3>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No recent activity</p>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute bottom-0 left-[19px] top-0 w-px bg-gradient-to-b from-gold/30 via-gold/10 to-transparent" />
          {items.map((item, i) => {
            const cfg = ACTIVITY_ICON[item.type] || ACTIVITY_ICON.order;
            const Icon = cfg.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.04 }}
                className="relative flex items-start gap-3 py-2.5">
                <span className={`z-10 shrink-0 rounded-lg p-1.5 ${cfg.bg} ${cfg.color}`}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-gray-400">{item.description}</p>
                </div>
                {item.time && <span className="shrink-0 text-[10px] text-gray-500">{timeAgo(item.time)}</span>}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RECENT CUSTOMERS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function RecentCustomers({ customers }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45 }}
      className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Recent Customers</h3>
        <Link to="/admin/customers" className="text-sm text-gold transition hover:text-gold-light">View all →</Link>
      </div>
      {customers.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No customers yet</p>
      ) : (
        <div className="space-y-3">
          {customers.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.04 }}
              className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-gold/5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold/20 to-gold/5 text-sm font-bold text-gold">
                {c.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-gray-400">{c.email}</p>
              </div>
              <span className="whitespace-nowrap text-xs text-gray-400">{timeAgo(c.created_at)}</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * QUICK ACTIONS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function QuickActions() {
  const actions = [
    { to: '/admin/products/new', icon: Plus, label: 'Add Product', color: 'bg-emerald-500/15 text-emerald-500' },
    { to: '/admin/orders', icon: Eye, label: 'View Orders', color: 'bg-blue-500/15 text-blue-500' },
    { to: '/admin/reports', icon: FileBarChart, label: 'Reports', color: 'bg-gold/15 text-gold' },
    { to: '/admin/inventory', icon: Package, label: 'Inventory', color: 'bg-indigo-500/15 text-indigo-500' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}
      className="card p-6">
      <h3 className="mb-4 font-semibold">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}
            className="flex flex-col items-center gap-2 rounded-xl border border-black/5 p-4 text-center transition hover:border-gold/30 hover:bg-gold/5 dark:border-white/10">
            <span className={`rounded-xl p-3 ${color}`}><Icon size={22} /></span>
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RECENT ORDERS TABLE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function RecentOrdersTable({ orders }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.55 }}
      className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Recent Orders</h3>
        <Link to="/admin/orders" className="text-sm text-gold transition hover:text-gold-light">View all →</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-black/5 dark:border-white/10">
              <th className="py-3 font-medium">Order</th>
              <th className="font-medium">Customer</th>
              <th className="font-medium">Date</th>
              <th className="font-medium">Total</th>
              <th className="font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-black/5 transition hover:bg-gold/[0.03] dark:border-white/10">
                <td className="py-3 font-medium text-gold">{o.order_number}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                      {o.customer?.[0]?.toUpperCase() || '?'}
                    </div>
                    {o.customer}
                  </div>
                </td>
                <td className="text-gray-400">{dateFmt(o.placed_at)}</td>
                <td className="font-semibold">{inr(o.total)}</td>
                <td><span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusColor[o.status]}`}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
