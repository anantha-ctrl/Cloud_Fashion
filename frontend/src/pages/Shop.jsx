import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import { Spinner, Empty, SectionTitle } from '../components/ui';
import { Search } from 'lucide-react';
import Seo from '../components/Seo';

const SIZES = ['S', 'M', 'L', 'XL', 'UK7', 'UK8', 'UK9'];
const COLORS = ['Ivory', 'Noir', 'Blush', 'White', 'Black', 'Sage', 'Charcoal'];
const SORTS = [
  ['newest', 'Newest'], ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'], ['popularity', 'Popularity'], ['rating', 'Top Rated'],
];

export default function Shop() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sort: params.get('sort') || 'newest',
    sizes: [], colors: [], min: '', max: '',
  });

  const search = params.get('search') || '';

  const fetchProducts = useCallback(async (pageNum, append) => {
    append ? setLoadingMore(true) : setLoading(true);
    const qp = new URLSearchParams();
    if (slug) qp.set('category', slug);
    if (search) qp.set('search', search);
    if (filters.sort) qp.set('sort', filters.sort);
    if (filters.sizes.length) qp.set('size', filters.sizes.join(','));
    if (filters.colors.length) qp.set('color', filters.colors.join(','));
    if (filters.min) qp.set('min_price', filters.min);
    if (filters.max) qp.set('max_price', filters.max);
    qp.set('per_page', '12');
    qp.set('page', String(pageNum));
    try {
      const { data } = await api.get(`/api/products?${qp.toString()}`);
      setPagination(data.data.pagination);
      setItems((prev) => (append ? [...prev, ...data.data.products] : data.data.products));
    } finally { append ? setLoadingMore(false) : setLoading(false); }
  }, [slug, search, filters]);

  // Reset to page 1 whenever the category, search, or filters change.
  useEffect(() => { setPage(1); fetchProducts(1, false); }, [fetchProducts]);

  const loadMore = () => { const next = page + 1; setPage(next); fetchProducts(next, true); };

  const toggleArr = (key, val) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));

  const title = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : search ? `Results for "${search}"` : 'All Products';

  const FilterPanel = (
    <div className="space-y-7">
      <FilterGroup title="Price Range">
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" value={filters.min}
            onChange={(e) => setFilters((f) => ({ ...f, min: e.target.value }))} className="input !py-2 text-sm" />
          <span>–</span>
          <input type="number" placeholder="Max" value={filters.max}
            onChange={(e) => setFilters((f) => ({ ...f, max: e.target.value }))} className="input !py-2 text-sm" />
        </div>
      </FilterGroup>
      <FilterGroup title="Size">
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button key={s} onClick={() => toggleArr('sizes', s)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${filters.sizes.includes(s) ? 'border-gold bg-gold/10 text-gold' : 'border-black/10 dark:border-white/10'}`}>
              {s}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button key={c} onClick={() => toggleArr('colors', c)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${filters.colors.includes(c) ? 'border-gold bg-gold/10 text-gold' : 'border-black/10 dark:border-white/10'}`}>
              {c}
            </button>
          ))}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Seo title={title} description={`Shop ${title} at Cloud Fashion. ${pagination?.total ?? ''} curated styles with filters for size, colour, brand and price.`} />
      <SectionTitle eyebrow="Collection" title={title} />

      <div className="mb-6 flex items-center justify-between gap-3">
        <button onClick={() => setShowFilters(true)} className="btn-outline !py-2 text-sm lg:hidden">
          <SlidersHorizontal size={16} /> Filters
        </button>
        <p className="text-sm text-gray-400">{pagination?.total ?? 0} products</p>
        <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
          className="input !w-auto !py-2 text-sm">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-60 shrink-0 lg:block">{FilterPanel}</aside>

        <div className="flex-1">
          {loading ? <Spinner /> : items.length ? (
            <>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {pagination && page < pagination.pages && (
                <div className="mt-10 flex flex-col items-center gap-2">
                  <button onClick={loadMore} disabled={loadingMore} className="btn-outline">
                    {loadingMore ? 'Loading…' : 'Load More'}
                  </button>
                  <p className="text-xs text-gray-400">Showing {items.length} of {pagination.total}</p>
                </div>
              )}
            </>
          ) : (
            <Empty icon={Search} title="No products found" subtitle="Try adjusting your filters or search." />
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-white p-6 dark:bg-ink">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button onClick={() => setShowFilters(false)}><X /></button>
            </div>
            {FilterPanel}
            <button onClick={() => setShowFilters(false)} className="btn-gold mt-8 w-full">Apply Filters</button>
          </div>
        </div>
      )}
    </div>
  );
}

const FilterGroup = ({ title, children }) => (
  <div>
    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">{title}</h4>
    {children}
  </div>
);
