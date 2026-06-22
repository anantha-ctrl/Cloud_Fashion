import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import { Spinner } from '../components/ui';

export default function AdminInventory() {
  const [low, setLow] = useState(null);

  useEffect(() => { api.get('/api/admin/inventory/low-stock').then((r) => setLow(r.data.data)); }, []);
  if (!low) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Inventory</h1>
      {low.length === 0 ? (
        <div className="card flex items-center gap-3 p-6 text-emerald-500">
          <CheckCircle2 /> <span>All products are well stocked.</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle size={18} /> <span className="text-sm font-medium">{low.length} product(s) at or below their low-stock threshold</span>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-400">
                <tr className="border-b border-black/5 dark:border-white/10"><th className="p-4">Product</th><th>Current Stock</th><th>Alert Level</th><th>Status</th></tr>
              </thead>
              <tbody>
                {low.map((p) => (
                  <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                    <td className="p-4 font-medium">{p.name}</td>
                    <td className={p.stock === 0 ? 'font-bold text-rose-500' : 'text-amber-500'}>{p.stock}</td>
                    <td className="text-gray-400">{p.low_stock_alert}</td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${p.stock === 0 ? 'bg-rose-500/15 text-rose-500' : 'bg-amber-500/15 text-amber-500'}`}>
                        {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
