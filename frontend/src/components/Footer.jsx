import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Logo from './Logo';

export default function Footer() {
  const [email, setEmail] = useState('');

  const subscribe = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/newsletter', { email });
      toast.success('Subscribed! Welcome to Cloud Fashion.');
      setEmail('');
    } catch (err) { toast.error(err.message); }
  };

  return (
    <footer className="mt-20 border-t border-black/5 bg-ink pb-16 text-gray-300 dark:border-white/10 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo white className="h-14" />
          <p className="mt-4 text-sm text-gray-400">Premium fashion, curated for the modern wardrobe. Timeless pieces, crafted with care.</p>
          <div className="mt-5 flex gap-3">
            {[Instagram, Facebook, Twitter].map((Icon, i) => (
              <a key={i} href="#" className="rounded-full border border-white/10 p-2 hover:border-gold hover:text-gold"><Icon size={18} /></a>
            ))}
          </div>
        </div>

        <FooterCol title="Shop">
          <FLink to="/category/men">Men</FLink>
          <FLink to="/category/women">Women</FLink>
          <FLink to="/category/kids">Kids</FLink>
          <FLink to="/category/footwear">Footwear</FLink>
          <FLink to="/category/accessories">Accessories</FLink>
        </FooterCol>

        <FooterCol title="Company">
          <FLink to="/about">About Us</FLink>
          <FLink to="/contact">Contact</FLink>
          <FLink to="/privacy">Privacy Policy</FLink>
          <FLink to="/terms">Terms & Conditions</FLink>
        </FooterCol>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gold">Newsletter</h4>
          <p className="mb-3 text-sm text-gray-400">Get early access to drops & exclusive offers.</p>
          <form onSubmit={subscribe} className="flex gap-2">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email" className="input !bg-white/5 !py-2 text-sm" />
            <button className="btn-gold !px-3 !py-2"><Send size={16} /></button>
          </form>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Cloud Fashion. All rights reserved. Designed and Developed By <a href="https://cloudhawk.in/">CloudHawk</a>.
      </div>
    </footer>
  );
}

const FooterCol = ({ title, children }) => (
  <div>
    <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gold">{title}</h4>
    <ul className="space-y-2.5 text-sm">{children}</ul>
  </div>
);
const FLink = ({ to, children }) => (
  <li><Link to={to} className="text-gray-400 hover:text-gold">{children}</Link></li>
);
