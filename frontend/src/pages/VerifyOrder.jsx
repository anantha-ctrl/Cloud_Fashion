import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldX, Package, Loader2 } from 'lucide-react';
import api from '../api/client';
import { inr, dateFmt } from '../utils/format';
import Logo from '../components/Logo';

/**
 * Public delivery-verification page. Opened by scanning the invoice QR — reads a
 * signed token and shows the live order (items, ship-to, status) straight from the
 * DB so a courier can confirm the parcel matches the order. No login required.
 */
export default function VerifyOrder() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    api.get(`/api/orders/verify/${id}?t=${encodeURIComponent(token)}`)
      .then((r) => setState({ loading: false, data: r.data.data, error: '' }))
      .catch((err) => setState({ loading: false, data: null, error: err.message || 'Verification failed' }));
  }, [id, token]);

  const { loading, data, error } = state;

  return (
    <div className="min-h-screen bg-luxe-bg px-4 py-10 dark:bg-ink">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center"><Logo className="h-10" /></div>

        {loading ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-gray-400">
            <Loader2 className="animate-spin" /> Verifying order…
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15">
              <ShieldX size={34} className="text-rose-500" />
            </div>
            <h1 className="text-xl font-bold">Not verified</h1>
            <p className="mt-2 text-sm text-gray-400">{error}. This code is invalid, tampered, or expired.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Verified banner */}
            <div className="flex items-center gap-3 bg-emerald-500/15 px-6 py-5">
              <ShieldCheck size={34} className="shrink-0 text-emerald-500" />
              <div>
                <p className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">Order verified ✓</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Authentic order from Novo Clothing</p>
              </div>
            </div>

            <div className="space-y-5 p-6 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Order</p>
                  <p className="font-display text-lg font-bold text-gold">{data.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Placed</p>
                  <p className="font-medium">{dateFmt(data.placed_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Status" value={<span className="capitalize">{data.status}</span>} />
                <Field label="Payment" value={`${(data.payment_method || '').toUpperCase()} · ${data.payment_status}`} />
              </div>

              {/* Ship to */}
              <div className="rounded-xl bg-black/5 p-4 dark:bg-white/5">
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Ship to</p>
                <p className="font-semibold">{data.ship_to?.name}</p>
                {data.ship_to?.phone && <p className="text-gray-500 dark:text-gray-400">{data.ship_to.phone}</p>}
                <p className="text-gray-500 dark:text-gray-400">
                  {[data.ship_to?.city, data.ship_to?.state, data.ship_to?.pincode].filter(Boolean).join(', ')}
                </p>
              </div>

              {/* Items to verify against the parcel */}
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
                  <Package size={13} /> Items ({data.item_count})
                </p>
                <div className="space-y-2">
                  {data.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-black/5 px-3 py-2 dark:border-white/10">
                      <span className="font-medium">
                        {it.name}
                        {(it.size || it.color) && (
                          <span className="text-gray-400"> ({[it.size, it.color].filter(Boolean).join(', ')})</span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">× {it.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/10">
                <span className="font-semibold">Order total</span>
                <span className="font-display text-xl font-bold">{inr(data.total)}</span>
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          <Link to="/" className="text-gold hover:underline">Novo Clothing</Link> · secure order verification
        </p>
      </div>
    </div>
  );
}

const Field = ({ label, value }) => (
  <div className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="font-medium">{value}</p>
  </div>
);
