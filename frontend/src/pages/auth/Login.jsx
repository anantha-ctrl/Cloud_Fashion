import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import PasswordInput from '../../components/PasswordInput';
import { useAuth } from '../../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(localStorage.getItem('cf_remember') !== '0');
  const [loading, setLoading] = useState(false);

  const goAfterLogin = (user) =>
    navigate(user.role === 'admin' ? '/admin' : location.state?.from?.pathname || '/');

  const googleSignIn = () => {
    if (!GOOGLE_CLIENT_ID) {
      return toast('Google sign-in isn’t configured yet — add a Client ID to enable it.');
    }
    if (!window.google?.accounts?.oauth2) {
      return toast.error('Google library still loading — try again in a moment.');
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: async (resp) => {
        if (resp.error || !resp.access_token) return toast.error('Google sign-in was cancelled');
        try {
          const user = await loginWithGoogle(resp.access_token);
          toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
          goAfterLogin(user);
        } catch (e) { toast.error(e.message); }
      },
    });
    client.requestAccessToken();
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem('cf_remember', remember ? '1' : '0');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      goAfterLogin(user);
    } catch (err) {
      if (err.errors?.needs_verification) {
        toast('Please verify your email');
        navigate('/verify-otp', { state: { email: form.email } });
      } else toast.error(err.message);
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your style journey"
      footer={<>Don't have an account? <Link to="/register" className="font-semibold text-gold">Create one</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="relative">
          <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="email" required className="input pl-11" placeholder="Email address"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <PasswordInput required icon={Lock} placeholder="Password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded accent-gold" />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm text-gold">Forgot password?</Link>
        </div>

        <button disabled={loading} className="btn-gold w-full">{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>

      {/* Divider + social */}
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-gray-400">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" /> or <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>
      <button type="button" onClick={googleSignIn}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-black/10 px-6 py-3 font-semibold transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
        <GoogleIcon /> Continue with Google
      </button>

      <p className="mt-4 rounded-xl bg-gold/5 p-3 text-center text-xs text-gray-400">
        Demo — Admin: admin@cloudfashion.com / Admin@123 · Customer: customer@cloudfashion.com / Test@123
      </p>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 41.6 44 38 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
