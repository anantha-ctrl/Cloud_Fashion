import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell,
} from 'recharts';
import {
  IndianRupee, ShoppingCart, Users, Package, AlertTriangle, RefreshCw,
  TrendingUp, Clock, UserPlus, Receipt,
} from 'lucide-react';
import api from '../api/client';
import { inr, dateFmt, timeAgo, statusColor } from '../utils/format';
import { Spinner } from '../components/ui';

const TOOLTIP = { background: '#15151c', border: '1px solid #c9a96a44', borderRadius: 12 };
const LABEL = { color: '#ffffff', fontWeight: 600, marginBottom: 2 };
const ITEM = { color: '#e7d8b6' };
const STATUS_COLORS = {
  pending: '#f59e0b', processing: '#3b82f6', packed: '#6366f1',
  shipped: '#06b6d4', delivered: '#10b981', cancelled: '#f43f5e',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((silent) => {
    if (!silent) setData(null);
    setRefreshing(true);
    return api.get('/api/admin/dashboard')
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => { load(false); }, [load]);

  if (!data) return <Spinner />;

  const { cards, monthly_sales, status_breakdown, recent_orders, top_products = [], recent_customers = [] } = data;
  const monthData = monthly_sales.map((m) => ({ month: m.month.slice(5), revenue: Number(m.revenue), orders: Number(m.orders) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <button onClick={() => load(false)} disabled={refreshing} className="btn-outline !py-2 text-sm disabled:opacity-50">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card icon={IndianRupee} label="Total Sales" value={inr(cards.total_sales)} accent="text-emerald-500" />
        <Card icon={ShoppingCart} label="Total Orders" value={cards.total_orders} accent="text-blue-500" />
        <Card icon={Users} label="Customers" value={cards.total_customers} accent="text-indigo-500" />
        <Card icon={Package} label="Products" value={cards.total_products} accent="text-gold" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card icon={TrendingUp} label="Today's Revenue" value={inr(cards.today_sales)} accent="text-emerald-500" />
        <Card icon={Clock} label="Pending Orders" value={cards.pending_orders} accent="text-amber-500"
          to={cards.pending_orders > 0 ? '/admin/orders' : undefined} />
        <Card icon={Receipt} label="Avg Order Value" value={inr(cards.avg_order_value)} accent="text-blue-500" />
        <Card icon={UserPlus} label="New Customers (7d)" value={cards.new_customers_7d} accent="text-indigo-500" />
      </div>

      {cards.low_stock > 0 && (
        <Link to="/admin/inventory" className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
          <AlertTriangle size={20} /> <span className="text-sm font-medium">{cards.low_stock} product(s) low on stock — review inventory</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Revenue (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a96a" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#c9a96a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={TOOLTIP} labelStyle={LABEL} itemStyle={ITEM} formatter={(v) => inr(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#c9a96a" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 font-semibold">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={status_breakdown.map((s) => ({ status: s.status, count: Number(s.count) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="status" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
              <Tooltip cursor={{ fill: '#c9a96a18' }} contentStyle={TOOLTIP} labelStyle={LABEL} itemStyle={ITEM} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {status_breakdown.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.status] || '#c9a96a'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top products + Recent customers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Top Selling Products</h3>
            <Link to="/admin/reports" className="text-sm text-gold">Reports</Link>
          </div>
          {top_products.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {top_products.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-bold text-gold">{i + 1}</span>
                  <img src={p.image || 'https://via.placeholder.com/48'} alt="" className="h-11 w-9 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.units_sold} sold · {inr(p.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent Customers</h3>
            <Link to="/admin/customers" className="text-sm text-gold">View all</Link>
          </div>
          {recent_customers.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No customers yet</p>
          ) : (
            <div className="space-y-3">
              {recent_customers.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">
                    {c.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-gray-400">{c.email}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Recent Orders</h3>
          <Link to="/admin/orders" className="text-sm text-gold">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-gray-400">
              <tr><th className="py-2">Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recent_orders.map((o) => (
                <tr key={o.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-3 font-medium">{o.order_number}</td>
                  <td>{o.customer}</td>
                  <td className="text-gray-400">{dateFmt(o.placed_at)}</td>
                  <td className="font-semibold">{inr(o.total)}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusColor[o.status]}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const Card = ({ icon: Icon, label, value, accent, to }) => {
  const inner = (
    <div className="card flex items-center gap-4 p-5 transition hover:border-gold/30">
      <div className={`rounded-xl bg-black/5 p-3 dark:bg-white/5 ${accent}`}><Icon size={24} /></div>
      <div><p className="text-sm text-gray-400">{label}</p><p className="text-2xl font-bold">{value}</p></div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};
