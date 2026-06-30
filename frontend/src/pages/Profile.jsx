import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Lock, MapPin, Plus, Trash2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';

const TABS = [['profile', 'Profile', User], ['rewards', 'Rewards', Star], ['password', 'Password', Lock], ['addresses', 'Addresses', MapPin]];
const TAB_KEYS = TABS.map(([k]) => k);
const emptyAddr = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const initial = TAB_KEYS.includes(params.get('tab')) ? params.get('tab') : 'profile';
  const [tab, setTab] = useState(initial);

  // Keep the active tab in the URL so it can be deep-linked (e.g. /profile?tab=rewards).
  const selectTab = (key) => { setTab(key); setParams(key === 'profile' ? {} : { tab: key }, { replace: true }); };

  // Sync when the URL changes while already on this page (e.g. menu → Rewards).
  useEffect(() => {
    const t = params.get('tab');
    if (TAB_KEYS.includes(t) && t !== tab) setTab(t);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl font-bold">My Account</h1>

      {/* Mobile: horizontal scrollable tab bar (the desktop sidebar is hidden) */}
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:hidden">
        {TABS.map(([key, label, Icon]) => (
          <button key={key} onClick={() => selectTab(key)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${tab === key ? 'bg-gold text-ink' : 'border border-black/10 dark:border-white/10'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-48 shrink-0 sm:block">
          {TABS.map(([key, label, Icon]) => (
            <button key={key} onClick={() => selectTab(key)}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${tab === key ? 'bg-gold/10 text-gold' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </aside>
        <div className="min-w-0 flex-1">
          {tab === 'profile' && <ProfileTab user={user} updateUser={updateUser} />}
          {tab === 'rewards' && <RewardsTab />}
          {tab === 'password' && <PasswordTab />}
          {tab === 'addresses' && <AddressTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user, updateUser }) {
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/api/profile', form);
      updateUser({ name: data.data.name, phone: data.data.phone });
      toast.success('Profile updated');
    } catch (err) { toast.error(err.message); }
  };
  return (
    <form onSubmit={save} className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold">Edit Profile</h2>
      <div><label className="text-sm text-gray-400">Name</label>
        <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><label className="text-sm text-gray-400">Email</label>
        <input className="input mt-1 opacity-60" value={user.email} disabled /></div>
      <div><label className="text-sm text-gray-400">Phone</label>
        <input className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <button className="btn-gold">Save Changes</button>
    </form>
  );
}

function RewardsTab() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/api/loyalty').then((r) => setData(r.data.data)).catch(() => {}); }, []);
  if (!data) return <div className="card p-6 text-sm text-gray-400">Loading…</div>;

  const link = `${window.location.origin}/register?ref=${data.referral_code}`;
  const copy = (text, label) => { navigator.clipboard.writeText(text); toast.success(`${label} copied`); };

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-gray-400">Your points balance</p>
          <p className="font-display text-4xl font-bold text-gold">{data.points}</p>
          <p className="mt-1 text-xs text-gray-400">
            Worth ₹{(Math.round(data.points * (data.point_value ?? 1) * 100) / 100).toLocaleString()} · 1 point = ₹{data.point_value ?? 1}
          </p>
        </div>
        <Star size={56} className="fill-gold/20 text-gold/40" />
      </div>

      <div className="card p-6">
        <h3 className="font-semibold">Refer &amp; Earn</h3>
        <p className="mt-1 text-sm text-gray-400">
          Share your code. Your friend gets {data.signup_bonus} points on signup, and you get {data.referral_bonus} points when they place their first order.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-gold/40 bg-gold/5 px-4 py-2 font-mono font-bold text-gold">{data.referral_code}</span>
          <button onClick={() => copy(data.referral_code, 'Code')} className="btn-outline !py-2 text-sm">Copy code</button>
          <button onClick={() => copy(link, 'Invite link')} className="btn-gold !py-2 text-sm">Copy invite link</button>
        </div>
        {data.referred_count > 0 && <p className="mt-3 text-sm text-gray-400">You've referred {data.referred_count} friend(s). 🎉</p>}
      </div>

      <div className="card p-6">
        <h3 className="mb-3 font-semibold">Points history</h3>
        {data.history.length === 0 ? (
          <p className="text-sm text-gray-400">Earn points by placing orders — 5% back on every purchase.</p>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {data.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="capitalize">{h.note || h.type}</p>
                  <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`font-semibold ${h.points >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {h.points >= 0 ? '+' : ''}{h.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordTab() {
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/profile/password', form);
      toast.success('Password changed');
      setForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) { toast.error(err.message); }
  };
  return (
    <form onSubmit={save} className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold">Change Password</h2>
      <PasswordInput placeholder="Current password" value={form.current_password}
        onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
      <PasswordInput placeholder="New password" value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <PasswordInput placeholder="Confirm new password" value={form.password_confirmation}
        onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
      <button className="btn-gold">Update Password</button>
    </form>
  );
}

function AddressTab() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(emptyAddr);
  const [show, setShow] = useState(false);

  const load = () => api.get('/api/addresses').then((r) => setAddresses(r.data.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try { await api.post('/api/addresses', form); toast.success('Address added'); setForm(emptyAddr); setShow(false); load(); }
    catch (err) { toast.error(err.message); }
  };
  const del = async (id) => { await api.delete(`/api/addresses/${id}`); toast.success('Removed'); load(); };
  const makeDefault = async (a) => { await api.put(`/api/addresses/${a.id}`, { ...a, is_default: 1 }); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saved Addresses</h2>
        <button onClick={() => setShow((s) => !s)} className="flex items-center gap-1 text-sm text-gold"><Plus size={16} /> Add</button>
      </div>
      {addresses.map((a) => (
        <div key={a.id} className="card flex items-start justify-between p-5">
          <div className="text-sm">
            <p className="font-semibold">{a.full_name} {a.is_default ? <span className="ml-2 rounded bg-gold/15 px-2 py-0.5 text-xs text-gold">Default</span> : null}</p>
            <p className="text-gray-400">{a.line1}, {a.city}, {a.state} - {a.pincode}</p>
            <p className="text-gray-400">{a.phone}</p>
          </div>
          <div className="flex gap-2">
            {!a.is_default && <button onClick={() => makeDefault(a)} title="Set default" className="text-gray-400 hover:text-gold"><Star size={18} /></button>}
            <button onClick={() => del(a.id)} className="text-gray-400 hover:text-rose-500"><Trash2 size={18} /></button>
          </div>
        </div>
      ))}
      {show && (
        <form onSubmit={save} className="card grid gap-3 p-6 sm:grid-cols-2">
          <input required className="input" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input required className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input required className="input sm:col-span-2" placeholder="Address Line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          <input required className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input required className="input" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <input required className="input" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          <button className="btn-gold sm:col-span-2">Save Address</button>
        </form>
      )}
    </div>
  );
}
