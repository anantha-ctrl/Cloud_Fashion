import { useEffect, useState } from 'react';
import { Save, Store, Mail, Megaphone, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner } from '../components/ui';

// [key, label, placeholder, type]
const SECTIONS = [
  ['Brand', Store, [
    ['store_name', 'Store name', 'Cloud Fashion', 'text'],
  ]],
  ['Contact (shown on Contact page)', Mail, [
    ['store_contact_email', 'Contact email', 'support@cloudfashion.com', 'email'],
    ['store_contact_phone', 'Contact phone', '+91 98765 43210', 'text'],
    ['store_address', 'Studio / address', 'Bengaluru, India', 'text'],
    ['store_contact_to', 'Message inbox (Contact Us emails delivered here)', 'you@gmail.com', 'email'],
  ]],
  ['Announcement & shipping', Megaphone, [
    ['store_announcement', 'Top announcement bar (leave empty to hide)', 'FREE SHIPPING OVER ₹1999 · …', 'text'],
    ['store_free_shipping_min', 'Free shipping over (₹)', '1999', 'number'],
    ['store_base_shipping', 'Flat shipping fee (₹)', '79', 'number'],
  ]],
  ['Social & WhatsApp (leave empty to hide)', Share2, [
    ['store_instagram', 'Instagram URL', 'https://instagram.com/…', 'text'],
    ['store_facebook', 'Facebook URL', 'https://facebook.com/…', 'text'],
    ['store_twitter', 'Twitter / X URL', 'https://x.com/…', 'text'],
    ['store_whatsapp', 'WhatsApp number (intl, no +)', '919876543210', 'text'],
  ]],
];

export default function AdminSettings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/api/admin/settings').then((r) => setForm(r.data.data)).catch(() => setForm({})); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/api/admin/settings', form);
      setForm(data.data);
      toast.success(data.message + ' — changes are live on the storefront.');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (!form) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Store Settings</h1>

      <form onSubmit={save} className="space-y-5">
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {SECTIONS.map(([title, Icon, fields]) => (
            <div key={title} className="card space-y-4 p-6">
              <div className="flex items-center gap-2 text-gold">
                <Icon size={18} />
                <h2 className="font-semibold">{title}</h2>
              </div>
              {fields.map(([key, label, ph, type]) => (
                <label key={key} className="block">
                  <span className="text-sm font-medium">{label}</span>
                  <input type={type === 'email' ? 'email' : type === 'number' ? 'number' : 'text'}
                    min={type === 'number' ? '0' : undefined} className="input mt-1" placeholder={ph}
                    value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                </label>
              ))}
            </div>
          ))}
        </div>

        <button disabled={saving} className="btn-gold inline-flex !px-5 !py-2.5 text-sm">
          <Save size={15} /> {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
