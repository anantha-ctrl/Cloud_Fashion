import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Download, Upload, FileSpreadsheet, Eye, EyeOff, Barcode, X, Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr } from '../utils/format';
import { exportCsv, parseCsv } from '../utils/csv';
import { Spinner, Checkbox } from '../components/ui';

/** True for a syntactically valid 13-digit EAN-13 (correct check digit). */
function isValidEan13(v) {
  if (!/^\d{13}$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(v[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(v[12]);
}

/**
 * Render a scannable barcode to a PNG data URI. A valid 13-digit value prints as
 * a proper retail **EAN-13**; anything else (custom SKU) falls back to CODE128.
 * Values stay crisp on the ~1.5-inch price-tag and resolve straight to a product
 * at billing.
 */
function barcodeDataUrl(value, { width = 2, height = 48, fontSize = 13 } = {}) {
  const v = String(value);
  const canvas = document.createElement('canvas');
  const opts = { width, height, displayValue: true, fontSize, textMargin: 2, margin: 6, background: '#ffffff', lineColor: '#111111' };
  JsBarcode(canvas, v, { ...opts, format: isValidEan13(v) ? 'EAN13' : 'CODE128' });
  return canvas.toDataURL('image/png');
}

export default function AdminProducts() {
  const [products, setProducts] = useState(null);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);
  const [qrProduct, setQrProduct] = useState(null); // product whose QR label is open
  const fileRef = useRef(null);

  const load = () => api.get('/api/admin/products').then((r) => { setProducts(Array.isArray(r.data.data) ? r.data.data : []); setSelected([]); }).catch(() => setProducts([]));
  useEffect(() => { load(); }, []);

  // ---- CSV bulk upload ----
  const downloadTemplate = () =>
    exportCsv('products-template', [{
      name: 'Sample Cotton Shirt', category: 'Men', brand: 'Cloud Label',
      price: '1499', mrp: '1999', stock: '25', low_stock_alert: '5',
      description: 'Soft breathable cotton shirt.', image: 'https://example.com/shirt.jpg', active: 'yes',
    }]);

  const onFilePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) { toast.error('CSV is empty or has no data rows'); return; }
      const { data } = await api.post('/api/admin/products/import', { rows });
      const { created, failed, errors, new_categories } = data.data;
      if (created) toast.success(`${created} product(s) imported`);
      if (new_categories?.length) toast(`New categor${new_categories.length > 1 ? 'ies' : 'y'} created: ${new_categories.join(', ')}`, { icon: '🏷️' });
      if (failed) toast.error(`${failed} row(s) skipped${errors?.[0] ? ` — e.g. ${errors[0]}` : ''}`);
      if (!created && !failed) toast('Nothing to import');
      load();
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/api/admin/products/${id}`);
    toast.success('Product deleted');
    load();
  };

  const bulk = async (action) => {
    if (action === 'delete' && !confirm(`Delete ${selected.length} product(s)?`)) return;
    try {
      const { data } = await api.post('/api/admin/products/bulk', { ids: selected, action });
      toast.success(`${data.data.affected} product(s) updated`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  if (!products) return <Spinner />;
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const allSelected = filtered.length > 0 && filtered.every((p) => selected.includes(p.id));
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((p) => p.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const doExport = () =>
    exportCsv('products', products.map((p) => ({
      id: p.id, name: p.name, brand: p.brand, category: p.category,
      price: p.price, mrp: p.mrp, stock: p.stock, sold: p.sold_count, active: p.is_active ? 'yes' : 'no',
    })));

  // Generate every product's barcode price-tag onto ONE printable sheet — no
  // downloading one label at a time. `list` = products to label (all / selected).
  const printQrLabels = (list) => {
    if (!list.length) { toast.error('No products to label'); return; }
    try {
      const labels = list.map((p) => ({ ...p, dataUrl: barcodeDataUrl(p.barcode || p.id) }));
      const w = window.open('', '_blank', 'width=900,height=1000');
      if (!w) { toast.error('Allow pop-ups to print'); return; }
      const cards = labels.map((p) => priceTag(p)).join('');
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Barcode Labels (${labels.length})</title>
        <style>${TAG_STYLE}
          body{margin:0;padding:8mm}
          .grid{display:flex;flex-wrap:wrap;gap:6mm}
          @media print{@page{margin:8mm}}
        </style></head><body onload="window.print()">
        <div class="grid">${cards}</div>
        </body></html>`);
      w.document.close();
    } catch {
      toast.error('Could not generate barcode labels');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFilePicked} className="hidden" />
          <button onClick={downloadTemplate} className="btn-outline !py-2 text-sm" title="Download a sample CSV to fill in">
            <FileSpreadsheet size={16} /> Template
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-outline !py-2 text-sm disabled:opacity-50">
            <Upload size={16} /> {importing ? 'Importing…' : 'Bulk Upload'}
          </button>
          <button onClick={doExport} className="btn-outline !py-2 text-sm"><Download size={16} /> Export</button>
          <button onClick={() => printQrLabels(filtered)} className="btn-outline !py-2 text-sm" title="Print barcode price-tags for all products">
            <Barcode size={16} /> Barcode Labels
          </button>
          <Link to="/admin/products/new" className="btn-gold !py-2 text-sm"><Plus size={16} /> Add Product</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="input !py-2 pl-9 text-sm" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gold/10 p-3 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <button onClick={() => bulk('activate')} className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-gold/15"><Eye size={14} /> Activate</button>
          <button onClick={() => bulk('deactivate')} className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-gold/15"><EyeOff size={14} /> Hide</button>
          <button onClick={() => printQrLabels(products.filter((p) => selected.includes(p.id)))} className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-gold/15"><Barcode size={14} /> Barcode Labels</button>
          <button onClick={() => bulk('delete')} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-rose-500 hover:bg-rose-500/10"><Trash2 size={14} /> Delete</button>
          <button onClick={() => setSelected([])} className="ml-auto text-gray-400 hover:text-gold">Clear</button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-black/5 dark:border-white/10">
              <th className="p-4"><Checkbox checked={allSelected} onChange={toggleAll} /></th>
              <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className={`border-b border-black/5 last:border-0 dark:border-white/10 ${selected.includes(p.id) ? 'bg-gold/5' : ''}`}>
                <td className="p-4"><Checkbox checked={selected.includes(p.id)} onChange={() => toggleOne(p.id)} /></td>
                <td>
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
                    <button onClick={() => setQrProduct(p)} title="Barcode label" className="rounded-lg p-2 hover:bg-gold/10"><Barcode size={16} /></button>
                    <Link to={`/admin/products/${p.id}/edit`} className="rounded-lg p-2 hover:bg-gold/10"><Pencil size={16} /></Link>
                    <button onClick={() => remove(p.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qrProduct && <QrLabelModal product={qrProduct} onClose={() => setQrProduct(null)} />}
    </div>
  );
}

/** Generates a scannable barcode price-tag (encodes the product id) for the in-store billing scanner. */
function QrLabelModal({ product, onClose }) {
  const [dataUrl, setDataUrl] = useState('');
  const [copies, setCopies] = useState(1); // how many identical labels to print

  const value = product.barcode || product.id;
  useEffect(() => {
    try { setDataUrl(barcodeDataUrl(value, { height: 70, fontSize: 16 })); }
    catch { toast.error('Could not generate barcode'); }
  }, [value]);

  const printLabel = () => {
    if (!dataUrl) return;
    const n = Math.max(1, Math.min(500, Number(copies) || 1)); // clamp 1–500
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { toast.error('Allow pop-ups to print'); return; }
    const card = priceTag({ ...product, dataUrl });
    const cards = Array.from({ length: n }, () => card).join('');
    // Single copy prints centred; multiple copies tile onto one printable sheet.
    const layout = n === 1
      ? 'body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}'
      : 'body{margin:0;padding:8mm}.grid{display:flex;flex-wrap:wrap;gap:6mm}';
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(product.name)} — ${n} label(s)</title>
      <style>${TAG_STYLE}${layout}@media print{@page{margin:8mm}}</style></head><body onload="window.print()">
      ${n === 1 ? cards : `<div class="grid">${cards}</div>`}
      </body></html>`);
    w.document.close();
  };

  const downloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `barcode-${product.barcode || product.slug || product.id}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-xs p-0">
        <div className="flex items-center justify-between border-b border-black/5 p-4 dark:border-white/10">
          <h3 className="flex items-center gap-2 font-semibold"><Barcode size={17} className="text-gold" /> Barcode Label</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="p-5 text-center">
          <div className="mx-auto rounded-xl border border-black/10 bg-white px-3 py-4 dark:border-white/10">
            <p className="text-sm font-bold text-black">{product.name}</p>
            <p className="text-lg font-extrabold text-gold">{inr(product.price)}</p>
            {dataUrl ? <img src={dataUrl} alt="Product barcode" className="mx-auto mt-1 w-full max-w-[240px]" /> : <Spinner />}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">~1.5 inch price-tag · scans to add this product at billing.</p>

          {/* How many identical labels to print (e.g. one per physical item). */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-300">Copies to print</label>
            <input type="number" min="1" max="500" value={copies}
              onChange={(e) => setCopies(e.target.value)}
              className="input !h-9 !w-20 !py-0 text-center text-sm" />
          </div>
        </div>
        <div className="flex gap-2 border-t border-black/5 p-4 dark:border-white/10">
          <button onClick={printLabel} disabled={!dataUrl} className="btn-gold flex-1 justify-center disabled:opacity-50">
            <Printer size={16} /> Print {Math.max(1, Math.min(500, Number(copies) || 1))}
          </button>
          <button onClick={downloadPng} disabled={!dataUrl} className="rounded-xl border border-black/10 px-4 text-sm disabled:opacity-50 dark:border-white/10" title="Download PNG"><Download size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// ~1.5-inch price-tag sticker: product name, price, and the scannable barcode.
const TAG_STYLE = `
  *{font-family:'Segoe UI',Arial,sans-serif;box-sizing:border-box}
  .tag{width:1.5in;min-height:1.5in;border:1px solid #bbb;border-radius:8px;padding:6px 8px 7px;
       text-align:center;page-break-inside:avoid;display:inline-flex;flex-direction:column;
       align-items:center;justify-content:center;gap:2px;background:#fff}
  .tag .name{font-weight:700;font-size:10px;line-height:1.15;max-height:2.4em;overflow:hidden}
  .tag .price{font-weight:800;font-size:17px;color:#8a6d1f;margin:2px 0}
  .tag img{width:1.35in;height:auto;display:block}
`;
function priceTag(p) {
  return `<div class="tag">
    <div class="name">${escapeHtml(p.name)}</div>
    <div class="price">${escapeHtml(inr(p.price))}</div>
    <img src="${p.dataUrl}" alt="barcode">
  </div>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
