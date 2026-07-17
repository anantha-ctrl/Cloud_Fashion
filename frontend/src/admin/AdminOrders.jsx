import { useEffect, useState } from 'react';
import { Truck, Check, X, Clock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr, dateFmt, statusColor } from '../utils/format';
import { Spinner } from '../components/ui';

const STATUSES = ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('');
  const [review, setReview] = useState(null); // order id under payment review

  const load = () => api.get(`/api/admin/orders${filter && filter !== 'awaiting' ? `?status=${filter}` : ''}`)
    .then((r) => setOrders(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, [filter]);

  // Poll so new UPI submissions surface without a manual refresh.
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [filter]);

  const awaitingCount = (orders || []).filter((o) => o.payment_approval === 'pending').length;
  const visible = filter === 'awaiting'
    ? (orders || []).filter((o) => o.payment_approval === 'pending')
    : (orders || []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Orders</h1>

      <div className="flex flex-wrap gap-2">
        <Chip active={!filter} onClick={() => setFilter('')}>All</Chip>
        <Chip active={filter === 'awaiting'} onClick={() => setFilter('awaiting')}>
          <span className="inline-flex items-center gap-1"><Clock size={13} /> Payment approvals
            {awaitingCount > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{awaitingCount}</span>}
          </span>
        </Chip>
        {STATUSES.map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</Chip>)}
      </div>

      {!orders ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-gray-400">
              <tr className="border-b border-black/5 [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium dark:border-white/10">
                <th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th>Shipment</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => <OrderRow key={o.id} o={o} onSaved={load} onReview={() => setReview(o.id)} />)}
              {visible.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">No orders found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {review && <PaymentReviewModal id={review} onClose={() => setReview(null)} onDone={() => { setReview(null); load(); }} />}
    </div>
  );
}

function PaymentReviewModal({ id, onClose, onDone }) {
  const [proof, setProof] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => { api.get(`/api/admin/orders/${id}/payment`).then((r) => setProof(r.data.data)).catch(() => {}); }, [id]);

  const act = async (action) => {
    if (action === 'reject' && !note.trim()) return toast.error('Add a short reason for the customer');
    setBusy(action);
    try {
      await api.put(`/api/admin/orders/${id}/payment`, { action, note });
      toast.success(action === 'approve' ? 'Payment approved — order confirmed' : 'Payment rejected — customer notified');
      onDone();
    } catch (err) { toast.error(err.message); } finally { setBusy(''); }
  };

  const done = proof && proof.payment_approval !== 'pending' && proof.payment_approval !== 'none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="card relative max-h-[88vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck size={18} className="text-gold" /> Verify UPI Payment</h3>
        {!proof ? <div className="py-10"><Spinner /></div> : (
          <div className="mt-4 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Order" value={proof.order_number} />
              <Info label="Amount" value={inr(proof.total)} strong />
              <Info label="Customer" value={proof.customer} />
              <Info label="Phone" value={proof.phone || '—'} />
              <Info label="Txn / Ref ID" value={proof.payment_txn_id || '—'} className="col-span-2" />
            </div>

            <div>
              <span className="mb-1 block text-xs text-gray-400">Payment screenshot</span>
              {proof.payment_screenshot
                ? <a href={proof.payment_screenshot} target="_blank" rel="noreferrer">
                    <img src={proof.payment_screenshot} alt="proof" className="max-h-72 w-full rounded-xl border border-black/10 object-contain dark:border-white/10" />
                  </a>
                : <p className="text-gray-400">No screenshot uploaded.</p>}
            </div>

            {done ? (
              <p className={`rounded-xl px-3 py-2 text-center font-semibold ${proof.payment_approval === 'approved' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                Payment {proof.payment_approval}{proof.payment_note ? ` · ${proof.payment_note}` : ''}
              </p>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs text-gray-400">Note (required to reject)</span>
                  <input className="input" placeholder="e.g. Amount didn't match / txn not found"
                    value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <div className="flex gap-3">
                  <button onClick={() => act('approve')} disabled={!!busy}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 font-semibold text-white disabled:opacity-50">
                    <Check size={16} /> {busy === 'approve' ? 'Approving…' : 'Approve & confirm'}
                  </button>
                  <button onClick={() => act('reject')} disabled={!!busy}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 font-semibold text-white disabled:opacity-50">
                    <X size={16} /> {busy === 'reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <button onClick={onClose} className="btn-outline mt-5 w-full">Close</button>
      </div>
    </div>
  );
}

const Info = ({ label, value, strong, className = '' }) => (
  <div className={className}>
    <span className="block text-xs text-gray-400">{label}</span>
    <span className={strong ? 'font-display text-lg font-bold text-gold' : 'font-medium'}>{value}</span>
  </div>
);

function OrderRow({ o, onSaved, onReview }) {
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
    <tr className="border-b border-black/5 align-top last:border-0 dark:border-white/10 [&>td]:px-4 [&>td]:py-4">
      <td className="font-medium">{o.order_number}</td>
      <td><p>{o.customer}</p><p className="text-xs text-gray-400">{o.email}</p></td>
      <td className="whitespace-nowrap text-gray-400">{dateFmt(o.placed_at)}</td>
      <td className="font-semibold">{inr(o.total)}</td>
      <td>
        <div className="flex flex-col items-start gap-1">
          <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[o.payment_status]}`}>{o.payment_status}</span>
          <span className="text-xs text-gray-400">{o.payment_method.toUpperCase()}</span>
          {o.payment_method === 'upi' && o.payment_approval === 'pending' && (
            <button onClick={onReview}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-xs font-semibold text-white">
              <Clock size={12} /> Review payment
            </button>
          )}
          {o.payment_method === 'upi' && o.payment_approval === 'rejected' && (
            <button onClick={onReview} className="text-xs font-semibold text-rose-500 hover:underline">rejected · view</button>
          )}
          {o.payment_method === 'upi' && o.payment_approval === 'approved' && (
            <button onClick={onReview} className="text-xs text-emerald-500 hover:underline">verified · view</button>
          )}
        </div>
      </td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className={`input !w-auto !py-1 text-xs capitalize ${statusColor[status]}`}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td>
        <div className="flex w-36 flex-col gap-1.5">
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier"
            className="input !w-full !py-1 text-xs" />
          <div className="flex items-center gap-1.5">
            <span className="text-gold"><Truck size={14} /></span>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking #"
              className="input !w-full !py-1 text-xs" />
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
