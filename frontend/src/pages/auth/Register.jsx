import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import PasswordInput from '../../components/PasswordInput';
import PasswordStrength from '../../components/PasswordStrength';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', password_confirmation: '',
    referral_code: (params.get('ref') || '').toUpperCase(),
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Check your email for the OTP.');
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Create account" subtitle="Join Cloud Fashion for exclusive drops"
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-gold">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <input required className="input" placeholder="Full name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input type="email" required className="input" placeholder="Email address" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" placeholder="Phone (optional)" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div>
          <PasswordInput required placeholder="Password (min 6 chars)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <PasswordStrength value={form.password} />
        </div>
        <div>
          <PasswordInput required placeholder="Confirm password" value={form.password_confirmation}
            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
          {form.password_confirmation && (
            <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${
              form.password === form.password_confirmation ? 'text-green-600' : 'text-red-500'}`}>
              {form.password === form.password_confirmation
                ? <><Check size={13} /> Passwords match</>
                : <><X size={13} /> Passwords don’t match</>}
            </p>
          )}
        </div>
        <input className="input" placeholder="Referral code (optional)" value={form.referral_code}
          onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })} />
        <button disabled={loading} className="btn-gold w-full">{loading ? 'Creating…' : 'Create Account'}</button>
      </form>
    </AuthShell>
  );
}
