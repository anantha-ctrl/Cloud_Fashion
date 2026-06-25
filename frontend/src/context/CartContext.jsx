import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

const GKEY = 'cf_guest_cart';
const readGuest = () => { try { return JSON.parse(localStorage.getItem(GKEY)) || []; } catch { return []; } };
const writeGuest = (list) => localStorage.setItem(GKEY, JSON.stringify(list));
const round2 = (n) => Math.round(n * 100) / 100;
const EMPTY = { items: [], summary: { subtotal: 0, total: 0, count: 0, shipping_fee: 0 } };

/** Build a cart payload (items + summary) from the guest localStorage list. */
function buildGuestCart(list) {
  let subtotal = 0;
  const items = list.map((it) => {
    const unit = Number(it.price) + Number(it.price_diff || 0);
    const line = unit * it.quantity;
    subtotal += line;
    return { ...it, id: it.key, unit_price: unit, line_total: round2(line) };
  });
  const shipping = subtotal >= 1999 || subtotal === 0 ? 0 : 79;
  return {
    items,
    summary: {
      subtotal: round2(subtotal),
      shipping_fee: shipping,
      total: round2(subtotal + shipping),
      count: items.reduce((s, i) => s + i.quantity, 0),
    },
  };
}

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState(() => buildGuestCart(readGuest()));
  const [loading, setLoading] = useState(false);
  const merged = useRef(false);

  const isAuthed = () => user && localStorage.getItem('cf_token');

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!user) { setCart(buildGuestCart(readGuest())); return; }
    try { const { data } = await api.get('/api/cart'); setCart(data.data); } catch { /* ignore */ }
  }, [user, authLoading]);

  // On login: merge the guest cart into the account.
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (!merged.current) {
        merged.current = true;
        const guest = readGuest();
        if (guest.length) {
          (async () => {
            for (const it of guest) {
              await api.post('/api/cart', {
                product_id: it.product_id, variant_id: it.variant_id, quantity: it.quantity,
              }).catch(() => {});
            }
            writeGuest([]); refresh();
          })();
          return;
        }
      }
      refresh();
    } else {
      merged.current = false;
      setCart(buildGuestCart(readGuest()));
    }
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (product, variantId = null, quantity = 1, variant = null) => {
    const productId = typeof product === 'object' ? product.id : product;

    if (isAuthed()) {
      setLoading(true);
      try {
        const { data } = await api.post('/api/cart', { product_id: productId, variant_id: variantId, quantity });
        setCart(data.data);
        toast.success('Added to cart');
        return true;
      } catch (e) {
        toast.error(e.response?.status === 401 ? 'Please log in to add items' : e.message);
        return false;
      } finally { setLoading(false); }
    }

    // Guest mode
    if (typeof product !== 'object') { toast.error('Please log in to add items to your cart'); return false; }
    const key = `${productId}-${variantId || 0}`;
    const guest = readGuest();
    const existing = guest.find((i) => i.key === key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      guest.unshift({
        key, product_id: productId, variant_id: variantId, quantity,
        name: product.name, slug: product.slug, price: product.price, mrp: product.mrp,
        price_diff: variant?.price_diff || 0, size: variant?.size || null, color: variant?.color || null,
        image: product.image || product.images?.[0]?.image_url || null,
      });
    }
    writeGuest(guest); setCart(buildGuestCart(guest));
    toast.success('Added to cart');
    return true;
  };

  const update = async (id, quantity) => {
    if (isAuthed()) { const { data } = await api.put(`/api/cart/${id}`, { quantity }); setCart(data.data); return; }
    const guest = readGuest().map((i) => (i.key === id ? { ...i, quantity: Math.max(1, quantity) } : i));
    writeGuest(guest); setCart(buildGuestCart(guest));
  };

  const remove = async (id) => {
    if (isAuthed()) { const { data } = await api.delete(`/api/cart/${id}`); setCart(data.data); toast.success('Removed'); return; }
    const guest = readGuest().filter((i) => i.key !== id);
    writeGuest(guest); setCart(buildGuestCart(guest)); toast.success('Removed');
  };

  const clear = async () => {
    if (isAuthed()) { const { data } = await api.delete('/api/cart'); setCart(data.data); return; }
    writeGuest([]); setCart(EMPTY);
  };

  return (
    <CartContext.Provider value={{ cart, loading, add, update, remove, clear, refresh, count: cart.summary.count }}>
      {children}
    </CartContext.Provider>
  );
}
