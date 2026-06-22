import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Only treat the session as authenticated if BOTH a token and a user exist.
    // (Prevents a "logged in with no token" state that cascades into 401s.)
    if (!localStorage.getItem('cf_token')) {
      localStorage.removeItem('cf_user');
      return null;
    }
    try { return JSON.parse(localStorage.getItem('cf_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cf_token');
    if (!token) { setLoading(false); return; }
    api.get('/api/auth/me')
      .then((res) => persist(token, res.data.data))
      .catch(() => logout())
      .finally(() => setLoading(false));

    // A 401 anywhere in the app dispatches this event; reset auth state so
    // ProtectedRoute can redirect to /login instead of looping on failed calls.
    const onForcedLogout = () => logout();
    window.addEventListener('cf:logout', onForcedLogout);
    return () => window.removeEventListener('cf:logout', onForcedLogout);
  }, []);

  const persist = (token, userData) => {
    localStorage.setItem('cf_token', token);
    localStorage.setItem('cf_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    persist(data.data.token, data.data.user);
    return data.data.user;
  };

  const register = (payload) => api.post('/api/auth/register', payload).then((r) => r.data);

  const verifyOtp = async (email, otp) => {
    const { data } = await api.post('/api/auth/verify-otp', { email, otp });
    persist(data.data.token, data.data.user);
    return data.data.user;
  };

  const logout = () => {
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_user');
    setUser(null);
  };

  const updateUser = (patch) => {
    setUser((u) => {
      const next = { ...u, ...patch };
      localStorage.setItem('cf_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, verifyOtp, logout, updateUser, isAdmin: user?.role === 'admin' }}
    >
      {children}
    </AuthContext.Provider>
  );
}
