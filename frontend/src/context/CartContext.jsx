import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState({ items: [], summary: { subtotal: 0, total: 0, count: 0, shipping_fee: 0 } });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    // Wait until auth has verified the token, so we never call /cart with a stale token.
    if (authLoading) return;
    if (!user) { setCart({ items: [], summary: { subtotal: 0, total: 0, count: 0, shipping_fee: 0 } }); return; }
    try {
      const { data } = await api.get('/api/cart');
      setCart(data.data);
    } catch { /* ignore */ }
  }, [user, authLoading]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = async (productId, variantId = null, quantity = 1) => {
    if (!user) { toast.error('Please log in to add items'); return false; }
    setLoading(true);
    try {
      const { data } = await api.post('/api/cart', { product_id: productId, variant_id: variantId, quantity });
      setCart(data.data);
      toast.success('Added to cart');
      return true;
    } catch (e) { toast.error(e.message); return false; }
    finally { setLoading(false); }
  };

  const update = async (id, quantity) => {
    const { data } = await api.put(`/api/cart/${id}`, { quantity });
    setCart(data.data);
  };

  const remove = async (id) => {
    const { data } = await api.delete(`/api/cart/${id}`);
    setCart(data.data);
    toast.success('Removed');
  };

  const clear = async () => {
    const { data } = await api.delete('/api/cart');
    setCart(data.data);
  };

  return (
    <CartContext.Provider value={{ cart, loading, add, update, remove, clear, refresh, count: cart.summary.count }}>
      {children}
    </CartContext.Provider>
  );
}
