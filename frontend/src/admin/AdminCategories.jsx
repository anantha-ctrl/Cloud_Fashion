import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner } from '../components/ui';

export default function AdminCategories() {
  const [cats, setCats] = useState(null);
  const [form, setForm] = useState({ id: null, name: '', description: '', image_url: '', is_active: 1 });
  const [show, setShow] = useState(false);

  const load = () => api.get('/api/categories').then((r) => setCats(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (form.id) await api.put(`/api/admin/categories/${form.id}`, form);
      else await api.post('/api/admin/categories', form);
      toast.success('Saved');
      setShow(false); setForm({ id: null, name: '', description: '', image_url: '', is_active: 1 });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const edit = (c) => { setForm({ id: c.id, name: c.name, description: c.description || '', image_url: c.image_url || '', is_active: c.is_active }); setShow(true); };
  const del = async (id) => { if (!confirm('Delete category? Products in it will be removed.')) return; await api.delete(`/api/admin/categories/${id}`); toast.success('Deleted'); load(); };

  if (!cats) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Categories</h1>
        <button onClick={() => { setForm({ id: null, name: '', description: '', image_url: '', is_active: 1 }); setShow(true); }} className="btn-gold !py-2 text-sm"><Plus size={16} /> Add</button>
      </div>

      {show && (
        <form onSubmit={save} className="card grid gap-4 p-6 sm:grid-cols-2">
          <input required className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-3">
            <button className="btn-gold">{form.id ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setShow(false)} className="btn-outline">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <div key={c.id} className="card flex items-center justify-between p-5">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-gray-400">{c.product_count} products</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => edit(c)} className="rounded-lg p-2 hover:bg-gold/10"><Pencil size={16} /></button>
              <button onClick={() => del(c.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
