import { useEffect, useState } from 'react';
import api from '../api/client';
import { inr, dateFmt } from '../utils/format';
import { Spinner } from '../components/ui';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => { api.get('/api/admin/customers').then((r) => setCustomers(r.data.data)); }, []);
  const open = (id) => api.get(`/api/admin/customers/${id}`).then((r) => setDetail(r.data.data));

  if (!customers) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Customers</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-black/5 dark:border-white/10">
              <th className="p-4">Name</th><th>Email</th><th>Orders</th><th>Spent</th><th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} onClick={() => open(c.id)} className="cursor-pointer border-b border-black/5 last:border-0 hover:bg-gold/5 dark:border-white/10">
                <td className="p-4 font-medium">{c.name}</td>
                <td className="text-gray-400">{c.email}</td>
                <td>{c.order_count}</td>
                <td className="font-semibold">{inr(c.total_spent)}</td>
                <td className="text-gray-400">{dateFmt(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="card relative max-h-[80vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold">{detail.name}</h3>
            <p className="text-gray-400">{detail.email} · {detail.phone || 'No phone'}</p>
            <h4 className="mt-6 mb-2 font-semibold">Order History ({detail.orders.length})</h4>
            <div className="space-y-2">
              {detail.orders.map((o) => (
                <div key={o.id} className="flex justify-between rounded-xl bg-black/5 p-3 text-sm dark:bg-white/5">
                  <span>{o.order_number}</span>
                  <span className="capitalize text-gray-400">{o.status}</span>
                  <span className="font-semibold">{inr(o.total)}</span>
                </div>
              ))}
              {detail.orders.length === 0 && <p className="text-sm text-gray-400">No orders yet.</p>}
            </div>
            <button onClick={() => setDetail(null)} className="btn-outline mt-6 w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
