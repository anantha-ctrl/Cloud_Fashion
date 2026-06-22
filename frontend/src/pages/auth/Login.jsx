import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import PasswordInput from '../../components/PasswordInput';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(user.role === 'admin' ? '/admin' : location.state?.from?.pathname || '/');
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
        <input type="email" required className="input" placeholder="Email address"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <PasswordInput required placeholder="Password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-gold">Forgot password?</Link>
        </div>
        <button disabled={loading} className="btn-gold w-full">{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
      <p className="mt-4 rounded-xl bg-gold/5 p-3 text-center text-xs text-gray-400">
        Demo — Admin: admin@cloudfashion.com / Admin@123 · Customer: customer@cloudfashion.com / Test@123
      </p>
    </AuthShell>
  );
}
