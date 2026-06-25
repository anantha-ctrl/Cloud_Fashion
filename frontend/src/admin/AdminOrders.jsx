import { useEffect, useState } from 'react';
import { Truck, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr, dateFmt, statusColor } from '../utils/format';
import { Spinner } from '../components/ui';

const STATUSES = ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('');

  const load = () => api.get(`/api/admin/orders${filter ? `?status=${filter}` : ''}`).then((r) => setOrders(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, [filter]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Orders</h1>

      <div className="flex flex-wrap gap-2">
        <Chip active={!filter} onClick={() => setFilter('')}>All</Chip>
        {STATUSES.map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</Chip>)}
      </div>

      {!orders ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-gray-400">
              <tr className="border-b border-black/5 dark:border-white/10">
                <th className="p-4">Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th>Shipment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => <OrderRow key={o.id} o={o} onSaved={load} />)}
              {orders.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">No orders found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrderRow({ o, onSaved }) {
  const [status, setStatus] = useState(o.status);
  const [carrier, setCarrier] = useState(o.carrier || '');
  const [tracking, setTracking] = useState(o.tracking_number || '');
  const [saving, setSaving] = useState(false);

  const dirty = status !== o.status || carrier !== (o.carrier || '') || tracking !== (o.tracking_number || '');

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/api/admin/orders/${o.id}/status`, { status, carrier, tracking_number: tracking });
      toast.success('Order updated — customer notified');
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <tr className="border-b border-black/5 align-top last:border-0 dark:border-white/10">
      <td className="p-4 font-medium">{o.order_number}</td>
      <td><p>{o.customer}</p><p className="text-xs text-gray-400">{o.email}</p></td>
      <td className="text-gray-400">{dateFmt(o.placed_at)}</td>
      <td className="font-semibold">{inr(o.total)}</td>
      <td>
        <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[o.payment_status]}`}>{o.payment_status}</span>
        <p className="mt-0.5 text-xs text-gray-400">{o.payment_method.toUpperCase()}</p>
      </td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className={`input !w-auto !py-1 text-xs capitalize ${statusColor[status]}`}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td>
        <div className="flex flex-col gap-1.5">
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier"
            className="input !w-32 !py-1 text-xs" />
          <div className="flex items-center gap-1.5">
            <span className="text-gold"><Truck size={14} /></span>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking #"
              className="input !w-32 !py-1 text-xs" />
          </div>
          {dirty && (
            <button onClick={save} disabled={saving}
              className="mt-0.5 flex items-center justify-center gap-1 rounded-lg bg-gold px-2 py-1 text-xs font-semibold text-ink disabled:opacity-50">
              <Check size={13} /> {saving ? 'Saving…' : 'Save & notify'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

const Chip = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${active ? 'bg-gold text-ink' : 'glass'}`}>{children}</button>
);
