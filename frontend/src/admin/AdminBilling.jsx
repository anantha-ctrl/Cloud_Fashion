import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Printer, X, Ban,
  Calculator, IndianRupee, CreditCard, Smartphone, Wallet, User, ScrollText,
  ScanLine, Camera, CameraOff,
} from 'lucide-react';
import jsQR from 'jsqr';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner, Empty } from '../components/ui';
import { inr, dateFmt } from '../utils/format';

const PAY = [
  ['cash', Wallet, 'Cash'],
  ['upi', Smartphone, 'UPI'],
  ['card', CreditCard, 'Card'],
  ['other', IndianRupee, 'Other'],
];

const money = (n) => `₹${(Number(n) || 0).toFixed(2)}`;

// Product image: use the direct URL when present, else the cached passthrough
// endpoint (streams admin-uploaded base64 images), with an icon fallback.
const IMG_BASE = api.defaults.baseURL || '';
function ThumbImg({ product }) {
  const [err, setErr] = useState(false);
  if (err) return <span className="flex h-full items-center justify-center text-gray-300"><ShoppingCart /></span>;
  return (
    <img src={product.image || `${IMG_BASE}/api/products/${product.id}/thumb`}
      alt={product.name} loading="lazy" onError={() => setErr(true)}
      className="h-full w-full object-cover transition group-hover:scale-105" />
  );
}

export default function AdminBilling() {
  const [tab, setTab] = useState('new'); // new | history
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState(null);

  // --- POS state ---
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState([]);
  const [discType, setDiscType] = useState('flat'); // flat | percent
  const [discVal, setDiscVal] = useState('');
  const [taxPct, setTaxPct] = useState('0');
  const [pay, setPay] = useState('cash');
  const [paid, setPaid] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState(null); // last saved bill for the invoice modal
  const [scanning, setScanning] = useState(false);

  const loadHistory = () =>
    api.get('/api/admin/billing').then((r) => setHistory(r.data.data)).catch(() => setHistory({ bills: [], stats: {} }));

  useEffect(() => {
    api.get('/api/admin/billing/config')
      .then((r) => { setConfig(r.data.data); setTaxPct(String(r.data.data.tax_pct ?? 0)); })
      .catch(() => setConfig({ store_name: 'Nova Clothing', tax_pct: 0 }));
    loadHistory();
  }, []);

  // Debounced live product search.
  const timer = useRef(null);
  useEffect(() => {
    clearTimeout(timer.current);
    setSearching(true);
    timer.current = setTimeout(() => {
      api.get('/api/admin/billing/products', { params: { q } })
        .then((r) => setResults(r.data.data))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  const addItem = (p) => {
    if (p.stock <= 0) { toast.error(`${p.name} is out of stock`); return false; }
    const ex = cart.find((i) => i.product_id === p.id);
    if (ex && ex.quantity >= p.stock) { toast.error(`Only ${p.stock} in stock`); return false; }
    setCart((c) => {
      const e = c.find((i) => i.product_id === p.id);
      return e
        ? c.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...c, { product_id: p.id, name: p.name, price: p.price, stock: p.stock, sku: p.sku, image: p.image, quantity: 1 }];
    });
    return true;
  };

  // Resolve a scanned QR/barcode to a live product and drop it into the bill.
  const handleCode = async (code) => {
    try {
      const { data } = await api.get('/api/admin/billing/lookup', { params: { code } });
      if (addItem(data.data)) toast.success(`Added ${data.data.name}`);
    } catch (e) { toast.error(e.message); }
  };

  // Hardware barcode scanners "type" the code + Enter into the search box.
  const onSearchEnter = (e) => {
    if (e.key !== 'Enter') return;
    if (results[0] && addItem(results[0])) setQ('');
  };

  const setQty = (id, delta) =>
    setCart((c) =>
      c.map((i) => {
        if (i.product_id !== id) return i;
        const next = i.quantity + delta;
        if (next > i.stock) { toast.error(`Only ${i.stock} in stock`); return i; }
        return { ...i, quantity: Math.max(1, next) };
      }),
    );

  const removeItem = (id) => setCart((c) => c.filter((i) => i.product_id !== id));

  const resetBill = () => {
    setCart([]); setDiscVal(''); setDiscType('flat'); setPay('cash');
    setPaid(''); setCustName(''); setCustPhone(''); setNote('');
    setTaxPct(String(config?.tax_pct ?? 0));
  };

  // --- Live totals (preview; server is authoritative) ---
  const t = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const dv = Math.max(0, Number(discVal) || 0);
    const discount = Math.min(discType === 'percent' ? (subtotal * Math.min(dv, 100)) / 100 : dv, subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const tax = (taxable * Math.max(0, Number(taxPct) || 0)) / 100;
    const total = taxable + tax;
    const paidNum = pay === 'cash' ? Number(paid) || 0 : total;
    return { subtotal, discount, taxable, tax, total, change: Math.max(0, paidNum - total) };
  }, [cart, discVal, discType, taxPct, pay, paid]);

  const save = async () => {
    if (cart.length === 0) { toast.error('Add at least one item'); return; }
    if (pay === 'cash' && paid !== '' && Number(paid) < t.total) { toast.error('Amount paid is less than total'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/api/admin/billing', {
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        discount_type: discType,
        discount_value: Number(discVal) || 0,
        tax_pct: Number(taxPct) || 0,
        payment_method: pay,
        paid: pay === 'cash' ? (Number(paid) || t.total) : t.total,
        customer_name: custName,
        customer_phone: custPhone,
        note,
      });
      toast.success(data.message);
      setInvoice(data.data);
      resetBill();
      loadHistory();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const openInvoice = async (id) => {
    try { const { data } = await api.get(`/api/admin/billing/${id}`); setInvoice(data.data); }
    catch (e) { toast.error(e.message); }
  };

  const voidBill = async (id) => {
    if (!confirm('Void this bill and restock its items?')) return;
    try { const { data } = await api.put(`/api/admin/billing/${id}/void`); toast.success(data.message); loadHistory(); }
    catch (e) { toast.error(e.message); }
  };

  if (!config) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Receipt className="text-gold" /> Billing
        </h1>
        <div className="flex gap-2">
          {[['new', 'New Bill'], ['history', 'History']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === k ? 'bg-gold text-ink' : 'border border-black/10 dark:border-white/10'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'new' ? (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* ---- Product picker ---- */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchEnter}
                  placeholder="Search or scan — name, SKU, ID…"
                  className="input !pl-10" />
              </div>
              <button onClick={() => setScanning(true)}
                className="btn-gold shrink-0 !px-4 !py-3" title="Scan product QR / barcode">
                <ScanLine size={18} /> <span className="hidden sm:inline">Scan</span>
              </button>
            </div>

            {searching && results.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Searching…</p>
            ) : results.length === 0 ? (
              <Empty icon={Search} title="No products" subtitle="Try a different search." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {results.map((p) => (
                  <button key={p.id} onClick={() => addItem(p)} disabled={p.stock <= 0}
                    className="card group overflow-hidden p-0 text-left transition hover:ring-2 hover:ring-gold disabled:opacity-50">
                    <div className="aspect-square w-full overflow-hidden bg-black/5 dark:bg-white/5">
                      <ThumbImg product={p} />
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-semibold text-gold">{inr(p.price)}</span>
                        <span className={`text-xs ${p.stock <= 5 ? 'text-rose-500' : 'text-gray-400'}`}>{p.stock} left</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ---- Cart / bill ---- */}
          <div className="card sticky top-24 flex flex-col p-0">
            <div className="border-b border-black/5 p-4 dark:border-white/10">
              <h2 className="flex items-center gap-2 font-semibold"><ShoppingCart size={17} className="text-gold" /> Current Bill</h2>
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-8 py-12 text-center text-sm text-gray-400">
                <ShoppingCart size={30} className="text-gold/40" />
                Tap products to add them to the bill.
              </div>
            ) : (
              <div className="max-h-[38vh] divide-y divide-black/5 overflow-y-auto dark:divide-white/10">
                {cart.map((i) => (
                  <div key={i.product_id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-gray-400">{inr(i.price)} × {i.quantity} = <span className="text-gold">{money(i.price * i.quantity)}</span></p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(i.product_id, -1)} className="rounded-md border border-black/10 p-1 hover:bg-gold/10 dark:border-white/10"><Minus size={13} /></button>
                      <span className="w-7 text-center text-sm font-semibold">{i.quantity}</span>
                      <button onClick={() => setQty(i.product_id, 1)} className="rounded-md border border-black/10 p-1 hover:bg-gold/10 dark:border-white/10"><Plus size={13} /></button>
                      <button onClick={() => removeItem(i.product_id)} className="ml-1 rounded-md p-1 text-rose-500 hover:bg-rose-500/10"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals + controls */}
            <div className="space-y-3 border-t border-black/5 p-4 dark:border-white/10">
              <div className="grid grid-cols-2 gap-2">
                <input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Customer name" className="input !h-10 !py-0 text-sm" />
                <input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="Phone" className="input !h-10 !py-0 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Discount: ₹/% toggle + amount, as one aligned control */}
                <div className="flex h-10 items-center overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                  <div className="flex h-full shrink-0 border-r border-black/10 dark:border-white/10">
                    <button onClick={() => setDiscType('flat')} className={`px-2.5 text-sm transition ${discType === 'flat' ? 'bg-gold text-ink' : 'text-gray-400'}`}>₹</button>
                    <button onClick={() => setDiscType('percent')} className={`px-2.5 text-sm transition ${discType === 'percent' ? 'bg-gold text-ink' : 'text-gray-400'}`}>%</button>
                  </div>
                  <input type="number" min="0" value={discVal} onChange={(e) => setDiscVal(e.target.value)} placeholder="Discount" className="min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none" />
                </div>
                {/* Tax % */}
                <div className="flex h-10 items-center gap-1 rounded-xl border border-black/10 px-3 dark:border-white/10">
                  <Calculator size={14} className="shrink-0 text-gray-400" />
                  <input type="number" min="0" max="100" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                  <span className="shrink-0 text-xs text-gray-400">% tax</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {PAY.map(([k, Icon, label]) => (
                  <button key={k} onClick={() => setPay(k)}
                    className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] transition ${pay === k ? 'border-gold bg-gold/10 text-gold' : 'border-black/10 dark:border-white/10'}`}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              {pay === 'cash' && (
                <div className="grid grid-cols-2 items-center gap-2">
                  <input type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="Cash received" className="input !h-10 !py-0 text-sm" />
                  <span className="text-right text-sm text-gray-500">Change <b className="text-gold">{money(t.change)}</b></span>
                </div>
              )}

              <div className="space-y-1 border-t border-black/5 pt-3 text-sm dark:border-white/10">
                <Row label="Subtotal" value={money(t.subtotal)} />
                {t.discount > 0 && <Row label="Discount" value={`− ${money(t.discount)}`} accent="text-rose-500" />}
                {t.tax > 0 && <Row label={`Tax (${Number(taxPct) || 0}%)`} value={money(t.tax)} />}
                <div className="flex justify-between pt-1 text-base font-bold">
                  <span>Total</span><span className="text-gold">{money(t.total)}</span>
                </div>
              </div>

              <button onClick={save} disabled={saving || cart.length === 0}
                className="btn-gold w-full justify-center !py-2.5 disabled:opacity-50">
                <Receipt size={16} /> {saving ? 'Saving…' : `Charge ${money(t.total)}`}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <History data={history} onView={openInvoice} onVoid={voidBill} />
      )}

      {invoice && <InvoiceModal bill={invoice} config={config} onClose={() => setInvoice(null)} />}
      {scanning && <Scanner onClose={() => setScanning(false)} onCode={handleCode} />}
    </div>
  );
}

/** Live camera QR scanner — decodes with jsQR and reports each code (with a cooldown). */
function Scanner({ onClose, onCode }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [err, setErr] = useState('');
  const [last, setLast] = useState('');
  const seen = useRef({ code: '', t: 0 });
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode; // always call the latest handler without restarting the camera

  useEffect(() => {
    let stream = null, raf = 0, cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const v = videoRef.current, c = canvasRef.current;
      if (v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
        c.width = v.videoWidth; c.height = v.videoHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(v, 0, 0, c.width, c.height);
        const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
        const res = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
        if (res?.data) {
          const now = Date.now();
          if (res.data !== seen.current.code || now - seen.current.t > 1500) {
            seen.current = { code: res.data, t: now };
            setLast(res.data);
            onCodeRef.current(res.data);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        v.srcObject = stream;
        await v.play();
        raf = requestAnimationFrame(tick);
      } catch (e) {
        setErr(e?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access to scan.'
          : 'No camera found on this device.');
      }
    })();

    return () => { cancelled = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-black/5 p-4 dark:border-white/10">
          <h3 className="flex items-center gap-2 font-semibold"><ScanLine size={17} className="text-gold" /> Scan product QR</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
        </div>

        <div className="relative aspect-square w-full bg-black">
          {err ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center text-sm text-white/80">
              <CameraOff size={40} className="text-white/40" /> {err}
            </div>
          ) : (
            <>
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              {/* scanning reticle */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-56 w-56 rounded-2xl border-2 border-gold/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
          <Camera size={15} className="shrink-0 text-gold" />
          {last ? <span>Last scan: <b className="text-gold">{last}</b> — keep scanning to add more.</span>
                : <span>Point the camera at a product QR code.</span>}
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, accent }) => (
  <div className="flex justify-between text-gray-500 dark:text-gray-300">
    <span>{label}</span><span className={accent || ''}>{value}</span>
  </div>
);

function History({ data, onView, onVoid }) {
  if (!data) return <Spinner />;
  const s = data.stats || {};
  const KPI = [
    ["Today's sales", inr(s.today_sales)],
    ["Today's bills", s.today_count ?? 0],
    ['This month', inr(s.month_sales)],
    ['Bills this month', s.month_count ?? 0],
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPI.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {data.bills.length === 0 ? (
        <Empty icon={ScrollText} title="No bills yet" subtitle="Bills you create will appear here." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-white/10">
              <tr>
                <th className="p-3">Bill</th><th className="p-3">Customer</th><th className="p-3">Items</th>
                <th className="p-3">Total</th><th className="p-3">Pay</th><th className="p-3">Date</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {data.bills.map((b) => (
                <tr key={b.id} className={b.status === 'void' ? 'opacity-50' : ''}>
                  <td className="p-3 font-mono text-xs font-semibold">{b.bill_number}{b.status === 'void' && <span className="ml-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-500">VOID</span>}</td>
                  <td className="p-3">{b.customer_name || <span className="text-gray-400">Walk-in</span>}</td>
                  <td className="p-3">{b.items}</td>
                  <td className="p-3 font-semibold">{inr(b.total)}</td>
                  <td className="p-3 capitalize">{b.payment_method}</td>
                  <td className="p-3 whitespace-nowrap text-gray-400">{dateFmt(b.created_at)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onView(b.id)} title="View / print" className="rounded-lg p-2 text-gold hover:bg-gold/10"><Printer size={15} /></button>
                      {b.status !== 'void' && (
                        <button onClick={() => onVoid(b.id)} title="Void & restock" className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Ban size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InvoiceModal({ bill, config, onClose }) {
  const printInvoice = () => {
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) { toast.error('Allow pop-ups to print'); return; }
    const rows = bill.items.map((i) =>
      `<tr><td>${escapeHtml(i.product_name)}${i.sku ? `<br><span class="sku">${escapeHtml(i.sku)}</span>` : ''}</td>
       <td class="c">${i.quantity}</td><td class="r">${money(i.price)}</td><td class="r">${money(i.line_total)}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${bill.bill_number}</title>
      <style>
        *{font-family:'Segoe UI',Arial,sans-serif;box-sizing:border-box}
        body{margin:0;padding:16px;color:#111;font-size:12px}
        h1{font-size:18px;margin:0;text-align:center;letter-spacing:1px}
        .sub{text-align:center;color:#666;font-size:11px;margin:2px 0}
        .meta{margin:12px 0;font-size:11px;color:#333;display:flex;justify-content:space-between}
        table{width:100%;border-collapse:collapse;margin-top:6px}
        th,td{padding:5px 4px;border-bottom:1px solid #eee;vertical-align:top;text-align:left}
        th{border-bottom:1px solid #999;font-size:10px;text-transform:uppercase;color:#555}
        .c{text-align:center}.r{text-align:right}.sku{color:#999;font-size:9px}
        .tot{margin-top:8px;font-size:12px}
        .tot div{display:flex;justify-content:space-between;padding:2px 0}
        .grand{font-weight:700;font-size:15px;border-top:1px solid #999;margin-top:4px;padding-top:6px}
        .foot{text-align:center;color:#666;margin-top:16px;font-size:11px;border-top:1px dashed #ccc;padding-top:10px}
        .void{color:#e11d48;text-align:center;font-weight:700;border:2px solid #e11d48;padding:4px;margin:8px 0}
      </style></head><body onload="window.print()">
      <h1>${escapeHtml(config.store_name || 'Nova Clothing')}</h1>
      ${config.address ? `<p class="sub">${escapeHtml(config.address)}</p>` : ''}
      ${config.phone ? `<p class="sub">${escapeHtml(config.phone)}</p>` : ''}
      ${bill.status === 'void' ? '<div class="void">VOID</div>' : ''}
      <div class="meta">
        <div><b>${bill.bill_number}</b><br>${new Date(bill.created_at).toLocaleString('en-IN')}</div>
        <div style="text-align:right">${bill.customer_name ? escapeHtml(bill.customer_name) + '<br>' : ''}${bill.customer_phone ? escapeHtml(bill.customer_phone) : ''}</div>
      </div>
      <table><thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tot">
        <div><span>Subtotal</span><span>${money(bill.subtotal)}</span></div>
        ${bill.discount > 0 ? `<div><span>Discount</span><span>− ${money(bill.discount)}</span></div>` : ''}
        ${bill.tax_amount > 0 ? `<div><span>Tax (${bill.tax_pct}%)</span><span>${money(bill.tax_amount)}</span></div>` : ''}
        <div class="grand"><span>TOTAL</span><span>${money(bill.total)}</span></div>
        <div><span>Paid (${bill.payment_method})</span><span>${money(bill.paid)}</span></div>
        ${bill.change_due > 0 ? `<div><span>Change</span><span>${money(bill.change_due)}</span></div>` : ''}
      </div>
      <p class="foot">${escapeHtml(config.footer_note || 'Thank you!')}</p>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-sm p-0">
        <div className="flex items-center justify-between border-b border-black/5 p-4 dark:border-white/10">
          <h3 className="flex items-center gap-2 font-semibold"><Receipt size={17} className="text-gold" /> {bill.bill_number}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 text-sm">
          {bill.status === 'void' && <p className="mb-2 rounded-lg bg-rose-500/10 py-1.5 text-center text-xs font-bold text-rose-500">VOIDED — items restocked</p>}
          <p className="mb-3 text-xs text-gray-400">
            {new Date(bill.created_at).toLocaleString('en-IN')}
            {bill.customer_name && <> · {bill.customer_name}</>}
            {bill.cashier && <> · by {bill.cashier}</>}
          </p>
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {bill.items.map((i, idx) => (
              <div key={idx} className="flex justify-between py-2">
                <span className="min-w-0 flex-1 pr-2">{i.product_name} <span className="text-gray-400">× {i.quantity}</span></span>
                <span className="font-medium">{money(i.line_total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-black/5 pt-3 dark:border-white/10">
            <Row label="Subtotal" value={money(bill.subtotal)} />
            {bill.discount > 0 && <Row label="Discount" value={`− ${money(bill.discount)}`} accent="text-rose-500" />}
            {bill.tax_amount > 0 && <Row label={`Tax (${bill.tax_pct}%)`} value={money(bill.tax_amount)} />}
            <div className="flex justify-between pt-1 text-base font-bold"><span>Total</span><span className="text-gold">{money(bill.total)}</span></div>
            <Row label={`Paid (${bill.payment_method})`} value={money(bill.paid)} />
            {bill.change_due > 0 && <Row label="Change" value={money(bill.change_due)} />}
          </div>
        </div>
        <div className="flex gap-2 border-t border-black/5 p-4 dark:border-white/10">
          <button onClick={printInvoice} className="btn-gold flex-1 justify-center"><Printer size={16} /> Print</button>
          <button onClick={onClose} className="rounded-xl border border-black/10 px-4 text-sm dark:border-white/10">Close</button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
