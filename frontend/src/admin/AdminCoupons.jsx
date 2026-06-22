import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr, dateFmt } from '../utils/format';
import { Spinner } from '../components/ui';

const blank = { code: '', type: 'percentage', value: '', min_order: 0, max_discount: '', usage_limit: '', expires_at: '', is_active: 1 };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState(null);
  const [form, setForm] = useState(blank);
  const [show, setShow] = useState(false);

  const load = () => api.get('/api/admin/coupons').then((r) => setCoupons(r.data.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try { await api.post('/api/admin/coupons', form); toast.success('Coupon created'); setForm(blank); setShow(false); load(); }
    catch (err) { toast.error(err.message); }
  };
  const del = async (id) => { if (!confirm('Delete coupon?')) return; await api.delete(`/api/admin/coupons/${id}`); toast.success('Deleted'); load(); };

  if (!coupons) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Coupons</h1>
        <button onClick={() => setShow((s) => !s)} className="btn-gold !py-2 text-sm"><Plus size={16} /> Add Coupon</button>
      </div>

      {show && (
        <form onSubmit={save} className="card grid gap-4 p-6 sm:grid-cols-3">
          <input required className="input uppercase" placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed (₹)</option>
          </select>
          <input type="number" required className="input" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <input type="number" className="input" placeholder="Min order ₹" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
          <input type="number" className="input" placeholder="Max discount ₹ (optional)" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
          <input type="number" className="input" placeholder="Usage limit (optional)" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
          <input type="date" className="input" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <button className="btn-gold sm:col-span-2">Create Coupon</button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-black/5 dark:border-white/10">
              <th className="p-4">Code</th><th>Discount</th><th>Min Order</th><th>Used</th><th>Expires</th><th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                <td className="p-4 font-mono font-semibold text-gold">{c.code}</td>
                <td>{c.type === 'percentage' ? `${c.value}%` : inr(c.value)}</td>
                <td>{inr(c.min_order)}</td>
                <td>{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                <td className="text-gray-400">{c.expires_at ? dateFmt(c.expires_at) : '—'}</td>
                <td><button onClick={() => del(c.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
