import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr, dateFmt, statusColor } from '../utils/format';
import { Spinner } from '../components/ui';

const STATUSES = ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('');

  const load = () => api.get(`/api/admin/orders${filter ? `?status=${filter}` : ''}`).then((r) => setOrders(r.data.data));
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    try { await api.put(`/api/admin/orders/${id}/status`, { status }); toast.success('Status updated'); load(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Orders</h1>

      <div className="flex flex-wrap gap-2">
        <Chip active={!filter} onClick={() => setFilter('')}>All</Chip>
        {STATUSES.map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</Chip>)}
      </div>

      {!orders ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-400">
              <tr className="border-b border-black/5 dark:border-white/10">
                <th className="p-4">Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                  <td className="p-4 font-medium">{o.order_number}</td>
                  <td><p>{o.customer}</p><p className="text-xs text-gray-400">{o.email}</p></td>
                  <td className="text-gray-400">{dateFmt(o.placed_at)}</td>
                  <td className="font-semibold">{inr(o.total)}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[o.payment_status]}`}>{o.payment_status}</span>
                    <p className="mt-0.5 text-xs text-gray-400">{o.payment_method.toUpperCase()}</p>
                  </td>
                  <td>
                    <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}
                      className={`input !w-auto !py-1 text-xs capitalize ${statusColor[o.status]}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No orders found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const Chip = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${active ? 'bg-gold text-ink' : 'glass'}`}>{children}</button>
);
