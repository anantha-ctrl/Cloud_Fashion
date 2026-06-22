import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner } from '../components/ui';

const blank = {
  name: '', category_id: '', brand: '', description: '', price: '', mrp: '',
  stock: 0, low_stock_alert: 5, is_featured: 0, is_trending: 0, is_active: 1,
};

export default function AdminProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(blank);
  const [images, setImages] = useState([]); // {url}
  const [variants, setVariants] = useState([]);
  const [specs, setSpecs] = useState([{ k: '', v: '' }]);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    api.get('/api/categories').then((r) => setCats(r.data.data));
    if (editing) {
      // Load product via admin list (kept simple); fetch single via public slug not available by id, so use list.
      api.get('/api/admin/products').then((r) => {
        const p = r.data.data.find((x) => String(x.id) === String(id));
        if (p) {
          setForm({
            name: p.name, category_id: '', brand: p.brand || '', description: '', price: p.price,
            mrp: p.mrp, stock: p.stock, low_stock_alert: 5,
            is_featured: p.is_featured, is_trending: p.is_trending, is_active: p.is_active,
          });
          // Pull full detail (category, specs, variants, images) from public endpoint
          api.get(`/api/products/${p.slug}`).then((d) => {
            const f = d.data.data;
            setForm((s) => ({ ...s, category_id: f.category_id, description: f.description || '' }));
            setImages((f.images || []).map((i) => ({ url: i.image_url })));
            setVariants((f.variants || []).map((v) => ({ size: v.size || '', color: v.color || '', color_hex: v.color_hex || '', stock: v.stock, price_diff: v.price_diff })));
            if (f.specifications) setSpecs(Object.entries(f.specifications).map(([k, v]) => ({ k, v })));
          });
        }
        setLoading(false);
      });
    }
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = (e) => {
    const files = [...e.target.files];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, { url: reader.result }]);
      reader.readAsDataURL(file);
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    const specObj = {};
    specs.forEach((s) => { if (s.k) specObj[s.k] = s.v; });
    const payload = {
      ...form,
      specifications: specObj,
      images: images.map((i) => i.url),
      variants,
    };
    try {
      if (editing) await api.put(`/api/admin/products/${id}`, payload);
      else await api.post('/api/admin/products', payload);
      toast.success(editing ? 'Product updated' : 'Product created');
      navigate('/admin/products');
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <Spinner />;

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold">{editing ? 'Edit' : 'New'} Product</h1>

      <div className="card space-y-4 p-6">
        <Field label="Name"><input required className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select required className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">Select…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Brand"><input className="input" value={form.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
        </div>
        <Field label="Description"><textarea rows={3} className="input" value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Price (₹)"><input type="number" required className="input" value={form.price} onChange={(e) => set('price', e.target.value)} /></Field>
          <Field label="MRP (₹)"><input type="number" required className="input" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} /></Field>
          <Field label="Stock"><input type="number" className="input" value={form.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
          <Field label="Low-stock at"><input type="number" className="input" value={form.low_stock_alert} onChange={(e) => set('low_stock_alert', e.target.value)} /></Field>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <Toggle label="Active" v={form.is_active} on={(v) => set('is_active', v)} />
          <Toggle label="Featured" v={form.is_featured} on={(v) => set('is_featured', v)} />
          <Toggle label="Trending" v={form.is_trending} on={(v) => set('is_trending', v)} />
        </div>
      </div>

      {/* Images */}
      <div className="card space-y-3 p-6">
        <h3 className="font-semibold">Images</h3>
        <p className="text-xs text-gray-400">Data-URI images are uploaded to Cloudinary when configured; otherwise stored as-is.</p>
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative h-24 w-20">
              <img src={img.url} className="h-full w-full rounded-lg object-cover" alt="" />
              <button type="button" onClick={() => setImages(images.filter((_, x) => x !== i))}
                className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white"><X size={12} /></button>
            </div>
          ))}
          <label className="flex h-24 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gold/40 text-gold">
            <Plus /><input type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
          </label>
        </div>
        <input className="input text-sm" placeholder="…or paste an image URL and press Enter"
          onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value) { e.preventDefault(); setImages([...images, { url: e.target.value }]); e.target.value = ''; } }} />
      </div>

      {/* Variants */}
      <div className="card space-y-3 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Variants (Size / Color)</h3>
          <button type="button" onClick={() => setVariants([...variants, { size: '', color: '', color_hex: '#000000', stock: 0, price_diff: 0 }])}
            className="text-sm text-gold"><Plus size={14} className="inline" /> Add</button>
        </div>
        {variants.map((v, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <input className="input !py-2 text-sm" placeholder="Size" value={v.size} onChange={(e) => upd(setVariants, variants, i, 'size', e.target.value)} />
            <input className="input !py-2 text-sm" placeholder="Color" value={v.color} onChange={(e) => upd(setVariants, variants, i, 'color', e.target.value)} />
            <input type="color" className="input !py-1" value={v.color_hex} onChange={(e) => upd(setVariants, variants, i, 'color_hex', e.target.value)} />
            <input type="number" className="input !py-2 text-sm" placeholder="Stock" value={v.stock} onChange={(e) => upd(setVariants, variants, i, 'stock', e.target.value)} />
            <button type="button" onClick={() => setVariants(variants.filter((_, x) => x !== i))} className="text-rose-500"><Trash /></button>
          </div>
        ))}
      </div>

      {/* Specs */}
      <div className="card space-y-3 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Specifications</h3>
          <button type="button" onClick={() => setSpecs([...specs, { k: '', v: '' }])} className="text-sm text-gold"><Plus size={14} className="inline" /> Add</button>
        </div>
        {specs.map((s, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <input className="input !py-2 text-sm" placeholder="Label (e.g. Material)" value={s.k} onChange={(e) => upd(setSpecs, specs, i, 'k', e.target.value)} />
            <input className="input !py-2 text-sm" placeholder="Value (e.g. Cotton)" value={s.v} onChange={(e) => upd(setSpecs, specs, i, 'v', e.target.value)} />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button className="btn-gold">{editing ? 'Update Product' : 'Create Product'}</button>
        <button type="button" onClick={() => navigate('/admin/products')} className="btn-outline">Cancel</button>
      </div>
    </form>
  );
}

const upd = (setter, arr, i, k, val) => setter(arr.map((x, idx) => (idx === i ? { ...x, [k]: val } : x)));
const Field = ({ label, children }) => (<div><label className="mb-1 block text-sm text-gray-400">{label}</label>{children}</div>);
const Toggle = ({ label, v, on }) => (
  <label className="flex cursor-pointer items-center gap-2">
    <input type="checkbox" checked={!!Number(v)} onChange={(e) => on(e.target.checked ? 1 : 0)} className="h-4 w-4 accent-[#c9a96a]" /> {label}
  </label>
);
const Trash = () => <X size={16} />;
