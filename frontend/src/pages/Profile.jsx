import { useEffect, useState } from 'react';
import { User, Lock, MapPin, Plus, Trash2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';

const TABS = [['profile', 'Profile', User], ['password', 'Password', Lock], ['addresses', 'Addresses', MapPin]];
const emptyAddr = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl font-bold">My Account</h1>
      <div className="flex gap-6">
        <aside className="hidden w-48 shrink-0 sm:block">
          {TABS.map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${tab === key ? 'bg-gold/10 text-gold' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </aside>
        <div className="flex-1">
          {tab === 'profile' && <ProfileTab user={user} updateUser={updateUser} />}
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
