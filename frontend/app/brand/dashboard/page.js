'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, money } from '../../../lib/api';

const blankIng = () => ({ name: '', role: '', concern_level: 'unknown', source: '' });

export default function BrandDashboard() {
  const router = useRouter();
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [certs, setCerts] = useState([]);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    name: '', description: '', price_cents: 0, inventory_qty: 0, category_id: '',
    packaging_type: '', packaging_recyclable: '', origin_country: '',
    data_sources: '', certification_ids: [], allergens_declared: false, allergens: '',
    ingredients: [blankIng()],
  });

  const refresh = async () => {
    try {
      const me = await api('/api/auth/me', { auth: true });
      setBrand(me.brand);
      if (me.brand) {
        const list = await api('/api/brands/me/products', { auth: true });
        setProducts(list.items);
      }
    } catch { router.push('/login'); }
  };

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    refresh();
    api('/api/products/meta/categories').then((d) => setCategories(d.items)).catch(() => {});
    api('/api/products/meta/certifications').then((d) => setCerts(d.items)).catch(() => {});
  }, []);

  const registerBrand = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/api/brands', { method: 'POST', auth: true, body: { name: fd.get('name'), country: fd.get('country'), description: fd.get('description') } });
      refresh();
    } catch (e) { setMsg(e.message); }
  };

  const setIng = (i, k, v) => setForm((s) => {
    const ings = [...s.ingredients];
    ings[i] = { ...ings[i], [k]: v };
    return { ...s, ingredients: ings };
  });

  const aiDraft = async () => {
    try {
      const d = await api('/api/ai/draft-description', { method: 'POST', auth: true, body: { name: form.name, category: categories.find((c) => c.id === form.category_id)?.name, origin_country: form.origin_country, packaging_type: form.packaging_type } });
      setForm((s) => ({ ...s, description: d.text }));
      setMsg(`AI draft inserted (source: ${d.source}). Review before saving — AI never invents facts.`);
    } catch (e) { setMsg(e.message); }
  };

  const createProduct = async (e) => {
    e.preventDefault();
    setMsg(null);
    const payload = {
      ...form,
      price_cents: Math.round(Number(form.price_cents)),
      inventory_qty: Math.round(Number(form.inventory_qty)),
      category_id: form.category_id || null,
      packaging_recyclable: form.packaging_recyclable === '' ? null : form.packaging_recyclable === 'true',
      data_sources: form.data_sources.split(',').map((s) => s.trim()).filter(Boolean),
      allergens: form.allergens.split(',').map((s) => s.trim()).filter(Boolean),
      ingredients: form.ingredients.filter((i) => i.name.trim()),
    };
    try {
      const d = await api('/api/brands/me/products', { method: 'POST', auth: true, body: payload });
      setMsg(`Created "${d.product.name}" — transparency ${d.product.transparency_score}, sustainability ${d.product.sustainability_score}.`);
      setForm((s) => ({ ...s, name: '', description: '', ingredients: [blankIng()] }));
      refresh();
    } catch (e) { setMsg(e.message); }
  };

  const submitForReview = async (id) => {
    try {
      await api(`/api/brands/me/products/${id}/submit`, { method: 'POST', auth: true });
      setMsg('Submitted for review.');
      refresh();
    } catch (e) { setMsg(e.message); }
  };

  if (!brand) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold">Register your brand</h1>
        <form onSubmit={registerBrand} className="card p-6 mt-4 space-y-4">
          <div><label className="label">Brand name</label><input name="name" required className="input" /></div>
          <div><label className="label">Country</label><input name="country" className="input" /></div>
          <div><label className="label">Description</label><textarea name="description" className="input" rows={3} /></div>
          {msg && <p className="text-sm text-rose-500">{msg}</p>}
          <button className="btn-primary w-full">Register brand</button>
          <p className="text-xs text-evergreen-400">Brands start as “pending” until an admin verifies them.</p>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{brand.name}</h1>
          <p className="text-sm text-evergreen-500">Verification: <span className="font-medium">{brand.verification_status}</span></p>
        </div>
      </div>
      {msg && <div className="card p-3 text-sm text-evergreen-700">{msg}</div>}

      {/* Existing products */}
      <section>
        <h2 className="font-medium mb-3">Your products</h2>
        <div className="grid gap-3">
          {products.length === 0 && <p className="text-sm text-evergreen-500">No products yet.</p>}
          {products.map((p) => (
            <div key={p.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{p.name} <span className="text-xs text-evergreen-400">({p.status})</span></p>
                <p className="text-sm text-evergreen-500">{money(p.price_cents)} · transparency {p.transparency_score ?? '—'} · sustainability {p.sustainability_score ?? '—'}</p>
              </div>
              {['draft', 'rejected'].includes(p.status) && (
                <button onClick={() => submitForReview(p.id)} className="btn-ghost text-xs py-1.5 px-3">Submit for review</button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* New product form */}
      <section className="card p-6">
        <h2 className="font-medium mb-4">Add a product</h2>
        <form onSubmit={createProduct} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Name *</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Category</label>
              <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="label">Price (cents)</label><input type="number" className="input" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: e.target.value })} /></div>
            <div><label className="label">Inventory</label><input type="number" className="input" value={form.inventory_qty} onChange={(e) => setForm({ ...form, inventory_qty: e.target.value })} /></div>
            <div><label className="label">Packaging type</label><input className="input" placeholder="e.g. recycled_glass" value={form.packaging_type} onChange={(e) => setForm({ ...form, packaging_type: e.target.value })} /></div>
            <div><label className="label">Recyclable?</label>
              <select className="input" value={form.packaging_recyclable} onChange={(e) => setForm({ ...form, packaging_recyclable: e.target.value })}>
                <option value="">unknown</option><option value="true">yes</option><option value="false">no</option>
              </select>
            </div>
            <div><label className="label">Origin country</label><input className="input" value={form.origin_country} onChange={(e) => setForm({ ...form, origin_country: e.target.value })} /></div>
            <div><label className="label">Data sources * (comma-separated)</label><input className="input" placeholder="Brand INCI declaration, supplier spec" value={form.data_sources} onChange={(e) => setForm({ ...form, data_sources: e.target.value })} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label mb-0">Description</label>
              <button type="button" onClick={aiDraft} className="text-xs text-evergreen-600 hover:underline">✨ AI draft from structured fields</button>
            </div>
            <textarea className="input mt-1" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <label className="label">Certifications</label>
            <div className="flex flex-wrap gap-2">
              {certs.map((c) => {
                const on = form.certification_ids.includes(c.id);
                return (
                  <button type="button" key={c.id}
                    onClick={() => setForm((s) => ({ ...s, certification_ids: on ? s.certification_ids.filter((x) => x !== c.id) : [...s.certification_ids, c.id] }))}
                    className={`rounded-full px-3 py-1 text-xs border ${on ? 'bg-evergreen-600 text-white border-evergreen-600' : 'border-evergreen-200 text-evergreen-600'}`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label">Ingredients (each can carry its own source — boosts transparency)</label>
            <div className="space-y-2">
              {form.ingredients.map((ing, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input className="input col-span-4" placeholder="Name" value={ing.name} onChange={(e) => setIng(i, 'name', e.target.value)} />
                  <input className="input col-span-3" placeholder="Role" value={ing.role} onChange={(e) => setIng(i, 'role', e.target.value)} />
                  <select className="input col-span-2" value={ing.concern_level} onChange={(e) => setIng(i, 'concern_level', e.target.value)}>
                    {['unknown', 'none', 'low', 'moderate', 'high'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input className="input col-span-3" placeholder="Source" value={ing.source} onChange={(e) => setIng(i, 'source', e.target.value)} />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setForm((s) => ({ ...s, ingredients: [...s.ingredients, blankIng()] }))} className="mt-2 text-xs text-evergreen-600 hover:underline">+ Add ingredient</button>
          </div>

          <div className="flex items-center gap-2">
            <input id="ad" type="checkbox" checked={form.allergens_declared} onChange={(e) => setForm({ ...form, allergens_declared: e.target.checked })} />
            <label htmlFor="ad" className="text-sm text-evergreen-700">I declare allergen status (leave unchecked = unknown)</label>
            <input className="input flex-1" placeholder="allergens, comma-separated" value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} />
          </div>

          <button className="btn-primary">Create product</button>
        </form>
      </section>
    </div>
  );
}
