import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();
export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);

  const refresh = useCallback(async () => {
    if (authLoading) return; // wait for token verification
    if (!user) { setItems([]); return; }
    try {
      const { data } = await api.get('/api/wishlist');
      setItems(data.data);
    } catch { /* ignore */ }
  }, [user, authLoading]);

  useEffect(() => { refresh(); }, [refresh]);

  const ids = new Set(items.map((i) => i.id));
  const has = (productId) => ids.has(productId);

  const toggle = async (productId) => {
    if (!user) { toast.error('Please log in to use wishlist'); return; }
    try {
      if (has(productId)) {
        await api.delete(`/api/wishlist/${productId}`);
        setItems((prev) => prev.filter((i) => i.id !== productId));
      } else {
        await api.post('/api/wishlist', { product_id: productId });
        toast.success('Added to wishlist');
        refresh();
      }
    } catch (e) { toast.error(e.message); }
  };

  return (
    <WishlistContext.Provider value={{ items, has, toggle, refresh, count: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
}
