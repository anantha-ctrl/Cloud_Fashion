import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, Tag, CreditCard, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { inr } from '../utils/format';

const empty = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };

export default function Checkout() {
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState('razorpay');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!cart.items.length) navigate('/cart');
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    const { data } = await api.get('/api/addresses');
    setAddresses(data.data);
    const def = data.data.find((a) => a.is_default) || data.data[0];
    if (def) setSelected(def.id);
    if (!data.data.length) setShowForm(true);
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/api/addresses', { ...form, is_default: addresses.length === 0 });
      toast.success('Address saved');
      setForm(empty); setShowForm(false);
      await loadAddresses();
      setSelected(data.data.id);
    } catch (err) { toast.error(err.message); }
  };

  const applyCoupon = async () => {
    try {
      const { data } = await api.post('/api/coupons/apply', { code: coupon, subtotal: cart.summary.subtotal });
      setDiscount(data.data.discount);
      toast.success(`Coupon applied: -${inr(data.data.discount)}`);
    } catch (err) { setDiscount(0); toast.error(err.message); }
  };

  const subtotal = cart.summary.subtotal;
  const shipping = subtotal - discount >= 1999 ? 0 : 79;
  const total = Math.max(0, subtotal - discount + shipping);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const placeOrder = async () => {
    if (!selected) return toast.error('Please select a delivery address');
    setPlacing(true);
    try {
      const payload = { address_id: selected, coupon_code: discount ? coupon : undefined };

      if (method === 'cod') {
        const { data } = await api.post('/api/orders/cod', payload);
        toast.success('Order placed!');
        refresh();
        return navigate(`/order-success/${data.data.order_id}`);
      }

      // Razorpay flow
      const { data } = await api.post('/api/checkout/create-order', payload);
      const order = data.data;

      if (order.is_test || !order.razorpay_key) {
        // Keys not configured — simulate success so the flow is demoable end-to-end.
        await api.post('/api/checkout/verify', { order_id: order.order_id, is_test: true });
        toast.success('Payment successful (test mode)');
        refresh();
        return navigate(`/order-success/${order.order_id}`);
      }

      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: order.razorpay_key,
        amount: order.amount,
        currency: order.currency,
        name: 'Cloud Fashion',
        description: `Order ${order.order_number}`,
        order_id: order.razorpay_order_id,
        prefill: { name: user.name, email: user.email, contact: user.phone || '' },
        theme: { color: '#c9a96a' },
        handler: async (resp) => {
          await api.post('/api/checkout/verify', {
            order_id: order.order_id,
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          toast.success('Payment successful');
          refresh();
          navigate(`/order-success/${order.order_id}`);
        },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message);
    } finally { setPlacing(false); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl font-bold">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Addresses */}
          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Delivery Address</h2>
              <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-1 text-sm text-gold">
                <Plus size={16} /> Add New
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <button key={a.id} onClick={() => setSelected(a.id)}
                  className={`rounded-xl border p-4 text-left text-sm transition ${selected === a.id ? 'border-gold bg-gold/5' : 'border-black/10 dark:border-white/10'}`}>
                  <div className="flex justify-between">
                    <span className="font-semibold">{a.full_name}</span>
                    {selected === a.id && <Check size={16} className="text-gold" />}
                  </div>
                  <p className="mt-1 text-gray-400">{a.line1}, {a.city}, {a.state} - {a.pincode}</p>
                  <p className="text-gray-400">{a.phone}</p>
                </button>
              ))}
            </div>

            {showForm && (
              <form onSubmit={saveAddress} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input required className="input" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <input required className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input required className="input sm:col-span-2" placeholder="Address Line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
                <input className="input sm:col-span-2" placeholder="Address Line 2 (optional)" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
                <input required className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <input required className="input" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                <input required className="input" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                <button className="btn-gold sm:col-span-2">Save Address</button>
              </form>
            )}
          </section>

          {/* Payment method */}
          <section className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Payment Method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <PayOption active={method === 'razorpay'} onClick={() => setMethod('razorpay')} icon={CreditCard}
                title="Pay Online" subtitle="Card / UPI / Netbanking via Razorpay" />
              <PayOption active={method === 'cod'} onClick={() => setMethod('cod')} icon={Banknote}
                title="Cash on Delivery" subtitle="Pay when you receive" />
            </div>
          </section>
        </div>

        {/* Summary */}
        <div className="card h-fit p-6">
          <h3 className="mb-4 text-lg font-semibold">Order Summary</h3>
          <div className="mb-4 max-h-48 space-y-3 overflow-y-auto">
            {cart.items.map((i) => (
              <div key={i.id} className="flex gap-3 text-sm">
                <img src={i.image} className="h-14 w-12 rounded-lg object-cover" alt="" />
                <div className="flex-1">
                  <p className="line-clamp-1 font-medium">{i.name}</p>
                  <p className="text-gray-400">Qty {i.quantity}</p>
                </div>
                <span>{inr(i.line_total)}</span>
              </div>
            ))}
          </div>

          <div className="mb-4 flex gap-2">
            <input className="input !py-2 text-sm" placeholder="Coupon code" value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
            <button onClick={applyCoupon} className="btn-outline !px-4 !py-2 text-sm"><Tag size={14} /> Apply</button>
          </div>

          <Row label="Subtotal" value={inr(subtotal)} />
          {discount > 0 && <Row label="Discount" value={`-${inr(discount)}`} className="text-emerald-500" />}
          <Row label="Shipping" value={shipping ? inr(shipping) : 'Free'} />
          <div className="my-3 border-t border-black/5 dark:border-white/10" />
          <Row label="Total" value={inr(total)} bold />

          <button onClick={placeOrder} disabled={placing} className="btn-gold mt-6 w-full">
            {placing ? 'Processing…' : method === 'cod' ? 'Place Order' : `Pay ${inr(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, bold, className = '' }) => (
  <div className={`flex justify-between py-1.5 ${bold ? 'text-lg font-bold' : 'text-sm text-gray-500 dark:text-gray-300'} ${className}`}>
    <span>{label}</span><span>{value}</span>
  </div>
);

const PayOption = ({ active, onClick, icon: Icon, title, subtitle }) => (
  <button onClick={onClick}
    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${active ? 'border-gold bg-gold/5' : 'border-black/10 dark:border-white/10'}`}>
    <Icon size={22} className={active ? 'text-gold' : 'text-gray-400'} />
    <div><p className="font-semibold">{title}</p><p className="text-xs text-gray-400">{subtitle}</p></div>
  </button>
);
