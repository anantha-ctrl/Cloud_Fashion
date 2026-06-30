import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ImagePlus, X } from 'lucide-react';
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

  // Read the chosen file as a base64 data-URI (uploaded to Cloudinary when
  // configured, otherwise stored inline — image_url is MEDIUMTEXT).
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('Image too large (max 3 MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image_url: reader.result }));
    reader.readAsDataURL(file);
    e.target.value = ''; // allow re-selecting the same file
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

          {/* Category image — upload from device */}
          {form.image_url ? (
            <div className="relative h-[46px] w-full overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
              <img src={form.image_url} alt="Category" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setForm({ ...form, image_url: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1 text-white hover:bg-rose-500">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gold/50 text-sm text-gold hover:bg-gold/10">
              <ImagePlus size={16} /> Upload image
              <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
            </label>
          )}

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
