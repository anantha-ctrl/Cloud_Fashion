import { X } from 'lucide-react';

const TABLE = {
  apparel: {
    head: ['Size', 'Chest (in)', 'Waist (in)', 'Length (in)'],
    rows: [
      ['XS', '34', '28', '26'], ['S', '36', '30', '27'], ['M', '38', '32', '28'],
      ['L', '40', '34', '29'], ['XL', '42', '36', '30'], ['XXL', '44', '38', '31'],
    ],
  },
  footwear: {
    head: ['UK', 'EU', 'US', 'Foot (cm)'],
    rows: [
      ['UK6', '40', '7', '24.5'], ['UK7', '41', '8', '25.5'], ['UK8', '42', '9', '26.5'],
      ['UK9', '43', '10', '27.5'], ['UK10', '44', '11', '28.5'],
    ],
  },
};

export default function SizeGuideModal({ category, onClose }) {
  const isFootwear = /footwear|shoe/i.test(category || '');
  const data = isFootwear ? TABLE.footwear : TABLE.apparel;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="card relative w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-2 hover:bg-gold/10"><X size={18} /></button>
        <h3 className="font-display text-2xl font-bold">Size Guide</h3>
        <p className="mt-1 text-sm text-gray-400">{isFootwear ? 'Footwear sizing' : 'Apparel measurements'} — measurements are approximate.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gold/10 text-gold">
                {data.head.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i} className="border-b border-black/5 dark:border-white/10">
                  {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-semibold' : 'text-gray-500 dark:text-gray-300'}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-400">Tip: if you're between sizes, we recommend sizing up for a relaxed fit.</p>
      </div>
    </div>
  );
}
