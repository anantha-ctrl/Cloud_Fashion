import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr } from '../utils/format';
import { Spinner } from '../components/ui';

export default function AdminProducts() {
  const [products, setProducts] = useState(null);
  const [q, setQ] = useState('');

  const load = () => api.get('/api/admin/products').then((r) => setProducts(r.data.data));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/api/admin/products/${id}`);
    toast.success('Product deleted');
    load();
  };

  if (!products) return <Spinner />;
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <Link to="/admin/products/new" className="btn-gold !py-2 text-sm"><Plus size={16} /> Add Product</Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input className="input !py-2 pl-9 text-sm" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-black/5 dark:border-white/10">
              <th className="p-4">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={p.image} className="h-12 w-10 rounded-lg object-cover" alt="" />
                    <div><p className="font-medium">{p.name}</p><p className="text-xs text-gray-400">{p.brand}</p></div>
                  </div>
                </td>
                <td>{p.category}</td>
                <td className="font-semibold">{inr(p.price)}</td>
                <td><span className={p.stock <= 5 ? 'text-rose-500' : ''}>{p.stock}</span></td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-gray-500/15 text-gray-400'}`}>
                    {p.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <Link to={`/admin/products/${p.id}/edit`} className="rounded-lg p-2 hover:bg-gold/10"><Pencil size={16} /></Link>
                    <button onClick={() => remove(p.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
