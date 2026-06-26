'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import ProductCard from '../../components/ProductCard';

export default function ProductsPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [categories, setCategories] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [f, setF] = useState({ q: '', category: '', certification: '', min_transparency: '', sort: 'newest' });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && params.set(k, v));
    try {
      const d = await api(`/api/products?${params.toString()}`);
      setItems(d.items);
      setMeta({ total: d.total });
    } finally {
      setLoading(false);
    }
  }, [f]);

  useEffect(() => {
    api('/api/products/meta/categories').then((d) => setCategories(d.items)).catch(() => {});
    api('/api/products/meta/certifications').then((d) => setCerts(d.items)).catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Browse products</h1>
      <p className="text-sm text-evergreen-600">{meta.total} transparent products</p>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <input className="input md:col-span-2" placeholder="Search…" value={f.q} onChange={upd('q')} />
        <select className="input" value={f.category} onChange={upd('category')}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="input" value={f.certification} onChange={upd('certification')}>
          <option value="">Any certification</option>
          {certs.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="input" value={f.sort} onChange={upd('sort')}>
          <option value="newest">Newest</option>
          <option value="transparency">Most transparent</option>
          <option value="sustainability">Most sustainable</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <label className="label mb-0">Min transparency</label>
        <input type="range" min="0" max="100" step="5" value={f.min_transparency || 0} onChange={upd('min_transparency')} />
        <span className="tabular-nums w-8">{f.min_transparency || 0}</span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-evergreen-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-evergreen-500">No products match these filters.</p>
        ) : (
          items.map((p) => <ProductCard key={p.id} p={p} />)
        )}
      </div>
    </div>
  );
}
