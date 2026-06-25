import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Check, X, FileText, Truck, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr, dateFmt, statusColor } from '../utils/format';
import { printInvoice } from '../utils/invoice';
import { Spinner } from '../components/ui';
import { useCart } from '../context/CartContext';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh: refreshCart } = useCart();
  const [order, setOrder] = useState(null);

  const load = () => api.get(`/api/orders/${id}`).then((r) => setOrder(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const cancel = async () => {
    try { await api.put(`/api/orders/${id}/cancel`); toast.success('Order cancelled'); load(); }
    catch (e) { toast.error(e.message); }
  };

  const reorder = async () => {
    try {
      const { data } = await api.post(`/api/orders/${id}/reorder`);
      toast.success(data.message);
      await refreshCart();
      if (data.data.added) navigate('/cart');
    } catch (e) { toast.error(e.message); }
  };

  if (!order) return <Spinner className="min-h-[50vh]" />;
  const addr = order.shipping_address;
  const canCancel = !['shipped', 'delivered', 'cancelled'].includes(order.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/orders" className="text-sm text-gray-400 hover:text-gold">← Back to orders</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{order.order_number}</h1>
          <p className="text-sm text-gray-400">Placed {dateFmt(order.placed_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${statusColor[order.status]}`}>{order.status}</span>
          <button onClick={() => printInvoice(order)} className="btn-outline !py-2 text-sm">
            <FileText size={16} /> Invoice
          </button>
        </div>
      </div>

      {/* Timeline */}
      {order.status !== 'cancelled' && (
        <div className="card mt-6 flex justify-between p-6">
          {order.timeline.map((step, i) => (
            <div key={step.status} className="flex flex-1 flex-col items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${step.done ? 'bg-gold text-ink' : 'bg-black/10 text-gray-400 dark:bg-white/10'}`}>
                {step.done ? <Check size={16} /> : i + 1}
              </div>
              <span className="mt-2 text-xs capitalize">{step.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Shipment tracking */}
      {order.tracking_number && (
        <div className="card mt-4 flex flex-wrap items-center gap-3 p-5">
          <span className="rounded-xl bg-gold/15 p-2.5 text-gold"><Truck size={20} /></span>
          <div>
            <p className="text-sm font-semibold">Shipment tracking</p>
            <p className="text-sm text-gray-400">
              {order.carrier ? `${order.carrier} · ` : ''}Tracking #
              <span className="ml-1 font-mono font-semibold text-gold">{order.tracking_number}</span>
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          {order.items.map((it) => (
            <div key={it.id} className="card flex gap-4 p-4">
              <img src={it.image_url} className="h-24 w-20 rounded-xl object-cover" alt="" />
              <div className="flex-1">
                <p className="font-medium">{it.product_name}</p>
                <p className="text-sm text-gray-400">{it.size && `Size ${it.size}`} {it.color && `· ${it.color}`}</p>
                <p className="text-sm text-gray-400">Qty {it.quantity}</p>
              </div>
              <span className="font-semibold">{inr(it.line_total)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="card p-5 text-sm">
            <h3 className="mb-2 font-semibold">Delivery Address</h3>
            <p>{addr.full_name}</p>
            <p className="text-gray-400">{addr.line1}, {addr.city}, {addr.state} - {addr.pincode}</p>
            <p className="text-gray-400">{addr.phone}</p>
          </div>
          <div className="card p-5 text-sm">
            <h3 className="mb-2 font-semibold">Payment</h3>
            <Row label="Subtotal" value={inr(order.subtotal)} />
            {order.discount > 0 && <Row label="Discount" value={`-${inr(order.discount)}`} />}
            <Row label="Shipping" value={order.shipping_fee ? inr(order.shipping_fee) : 'Free'} />
            <div className="my-2 border-t border-black/5 dark:border-white/10" />
            <Row label="Total" value={inr(order.total)} bold />
            <p className="mt-2 text-gray-400">{order.payment_method.toUpperCase()} ·
              <span className={`ml-1 rounded px-2 py-0.5 ${statusColor[order.payment_status]}`}>{order.payment_status}</span>
            </p>
          </div>
          <button onClick={reorder} className="btn-gold w-full">
            <RotateCcw size={16} /> Reorder
          </button>
          {canCancel && (
            <button onClick={cancel} className="btn-outline w-full !border-rose-500/50 !text-rose-500">
              <X size={16} /> Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, bold }) => (
  <div className={`flex justify-between py-1 ${bold ? 'font-bold' : 'text-gray-500 dark:text-gray-300'}`}>
    <span>{label}</span><span>{value}</span>
  </div>
);
