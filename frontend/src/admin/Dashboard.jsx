import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid,
} from 'recharts';
import { IndianRupee, ShoppingCart, Users, Package, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { inr, dateFmt, statusColor } from '../utils/format';
import { Spinner } from '../components/ui';

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/api/admin/dashboard').then((r) => setData(r.data.data)); }, []);
  if (!data) return <Spinner />;

  const { cards, monthly_sales, status_breakdown, recent_orders } = data;
  const monthData = monthly_sales.map((m) => ({ month: m.month.slice(5), revenue: Number(m.revenue), orders: Number(m.orders) }));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card icon={IndianRupee} label="Total Sales" value={inr(cards.total_sales)} accent="text-emerald-500" />
        <Card icon={ShoppingCart} label="Total Orders" value={cards.total_orders} accent="text-blue-500" />
        <Card icon={Users} label="Customers" value={cards.total_customers} accent="text-indigo-500" />
        <Card icon={Package} label="Products" value={cards.total_products} accent="text-gold" />
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
              <Tooltip contentStyle={{ background: '#15151c', border: '1px solid #c9a96a44', borderRadius: 12 }}
                formatter={(v) => inr(v)} />
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
              <Tooltip contentStyle={{ background: '#15151c', border: '1px solid #c9a96a44', borderRadius: 12 }} />
              <Bar dataKey="count" fill="#c9a96a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Recent Orders</h3>
          <Link to="/admin/orders" className="text-sm text-gold">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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

const Card = ({ icon: Icon, label, value, accent }) => (
  <div className="card flex items-center gap-4 p-5">
    <div className={`rounded-xl bg-black/5 p-3 dark:bg-white/5 ${accent}`}><Icon size={24} /></div>
    <div><p className="text-sm text-gray-400">{label}</p><p className="text-2xl font-bold">{value}</p></div>
  </div>
);
