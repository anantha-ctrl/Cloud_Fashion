import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/client';
import { inr } from '../utils/format';
import { Spinner } from '../components/ui';

export default function AdminReports() {
  const [tab, setTab] = useState('sales');
  const [sales, setSales] = useState(null);
  const [products, setProducts] = useState(null);
  const [customers, setCustomers] = useState(null);

  useEffect(() => {
    api.get('/api/admin/reports/sales').then((r) => setSales(r.data.data));
    api.get('/api/admin/reports/products').then((r) => setProducts(r.data.data));
    api.get('/api/admin/reports/customers').then((r) => setCustomers(r.data.data));
  }, []);

  const TABS = [['sales', 'Sales'], ['products', 'Top Products'], ['customers', 'Top Customers']];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Reports</h1>
      <div className="flex gap-2">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${tab === k ? 'bg-gold text-ink' : 'glass'}`}>{l}</button>
        ))}
      </div>

      {tab === 'sales' && (!sales ? <Spinner /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Total Revenue" value={inr(sales.total_revenue)} />
            <Stat label="Total Orders" value={sales.total_orders} />
          </div>
          <div className="card p-6">
            <h3 className="mb-4 font-semibold">Daily Revenue (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sales.daily.map((d) => ({ day: d.day.slice(5), revenue: Number(d.revenue) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="day" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip contentStyle={{ background: '#15151c', border: '1px solid #c9a96a44', borderRadius: 12 }} formatter={(v) => inr(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#c9a96a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}

      {tab === 'products' && (!products ? <Spinner /> : (
        <Table head={['Product', 'Brand', 'Units Sold', 'Revenue', 'Stock']}
          rows={products.map((p) => [p.name, p.brand || '—', p.units_sold, inr(p.revenue), p.stock])} />
      ))}

      {tab === 'customers' && (!customers ? <Spinner /> : (
        <Table head={['Customer', 'Email', 'Orders', 'Total Spent']}
          rows={customers.map((c) => [c.name, c.email, c.orders, inr(c.total_spent)])} />
      ))}
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="card p-6"><p className="text-sm text-gray-400">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>
);

const Table = ({ head, rows }) => (
  <div className="card overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="text-left text-gray-400">
        <tr className="border-b border-black/5 dark:border-white/10">{head.map((h) => <th key={h} className="p-4">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-black/5 last:border-0 dark:border-white/10">
            {r.map((c, j) => <td key={j} className={`p-4 ${j === 0 ? 'font-medium' : ''}`}>{c}</td>)}
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={head.length} className="p-8 text-center text-gray-400">No data yet</td></tr>}
      </tbody>
    </table>
  </div>
);
