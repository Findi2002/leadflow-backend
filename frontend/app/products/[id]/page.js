'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, addToCart, money } from '../../../lib/api';
import ScoreBar from '../../../components/ScoreBar';

const concernColor = {
  none: 'text-evergreen-600', low: 'text-amber-600', moderate: 'text-orange-600',
  high: 'text-rose-600', unknown: 'text-gray-400',
};

function AIPanel({ slug }) {
  const [summary, setSummary] = useState(null);
  const [concerns, setConcerns] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        api(`/api/ai/products/${slug}/ingredient-summary`),
        api(`/api/ai/products/${slug}/concerns`),
      ]);
      setSummary(s);
      setConcerns(c);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">AI assistance</h3>
        {!summary && <button onClick={run} className="btn-ghost text-xs py-1.5 px-3" disabled={loading}>{loading ? 'Working…' : 'Explain in plain language'}</button>}
      </div>
      {summary && (
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-evergreen-500 uppercase">Ingredient summary</p>
            <p className="whitespace-pre-wrap text-evergreen-700">{summary.text}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-evergreen-500 uppercase">Potential concerns</p>
            <p className="whitespace-pre-wrap text-evergreen-700">{concerns.text}</p>
          </div>
          <p className="text-[11px] text-evergreen-400 border-t border-evergreen-100 pt-2">
            {summary.disclaimer} (source: {summary.source})
          </p>
        </div>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api(`/api/products/${id}`).then((d) => setP(d.product)).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <p className="text-rose-500">{err}</p>;
  if (!p) return <p className="text-evergreen-500">Loading…</p>;

  const Field = ({ label, value }) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-evergreen-50 last:border-0">
      <span className="text-evergreen-500">{label}</span>
      <span className={`font-medium text-right ${value == null || value === 'unknown' ? 'text-gray-400 italic' : ''}`}>
        {value == null || value === '' ? 'unknown' : String(value)}
      </span>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left: image + buy */}
      <div className="space-y-4">
        <div className="card overflow-hidden aspect-square bg-evergreen-100">
          {p.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-evergreen-500">{p.brand_name} {p.brand_verification === 'verified' && <span className="text-evergreen-600">✓ verified</span>}</p>
              <h1 className="text-2xl font-semibold">{p.name}</h1>
            </div>
            <div className="text-xl font-semibold">{money(p.price_cents, p.currency)}</div>
          </div>
          <p className="mt-2 text-sm text-evergreen-600">{p.description || 'No description provided.'}</p>
          <button
            onClick={() => { addToCart(p); setAdded(true); setTimeout(() => setAdded(false), 1500); }}
            className="btn-primary mt-4 w-full"
            disabled={p.inventory_qty <= 0}
          >
            {p.inventory_qty <= 0 ? 'Out of stock' : added ? 'Added ✓' : 'Add to cart'}
          </button>
          <p className="mt-2 text-xs text-evergreen-400">{p.inventory_qty} in stock</p>
        </div>
      </div>

      {/* Right: transparency data */}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreBar label="Transparency" score={p.transparency_score} breakdown={p.transparency_breakdown} />
          <ScoreBar label="Sustainability" score={p.sustainability_score} breakdown={p.sustainability_breakdown} />
        </div>

        <div className="card p-5">
          <h3 className="font-medium mb-2">Product facts</h3>
          <Field label="Category" value={p.category_name} />
          <Field label="Packaging" value={p.packaging_type} />
          <Field label="Recyclable packaging" value={p.packaging_recyclable == null ? 'unknown' : p.packaging_recyclable ? 'yes' : 'no'} />
          <Field label="Country of origin" value={p.origin_country} />
          <Field
            label="Allergens"
            value={!p.allergens_declared ? 'unknown (not declared)' : p.allergens.length ? p.allergens.join(', ') : 'none declared'}
          />
        </div>

        <div className="card p-5">
          <h3 className="font-medium mb-3">Ingredients</h3>
          {p.ingredients.length === 0 ? (
            <p className="text-sm text-gray-400 italic">unknown — no structured ingredient list provided.</p>
          ) : (
            <ul className="divide-y divide-evergreen-50">
              {p.ingredients.map((ing) => (
                <li key={ing.id} className="py-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{ing.name}</span>
                    <span className={`text-xs ${concernColor[ing.concern_level] || 'text-gray-400'}`}>
                      concern: {ing.concern_level}
                    </span>
                  </div>
                  <div className="text-xs text-evergreen-500">
                    {ing.role || 'role unknown'}
                    {ing.source ? ` · source: ${ing.source}` : ' · source: unknown'}
                    {ing.note ? ` · ${ing.note}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-medium mb-2">Certifications</h3>
          {p.certifications.length === 0 ? (
            <p className="text-sm text-gray-400 italic">unknown — none linked.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {p.certifications.map((c) => (
                <span key={c.id} className="rounded-full bg-evergreen-100 text-evergreen-700 px-3 py-1 text-xs">
                  {c.name}{c.issuer ? ` · ${c.issuer}` : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-medium mb-2">Data sources</h3>
          {p.data_sources?.length ? (
            <ul className="list-disc pl-5 text-sm text-evergreen-600 space-y-1">
              {p.data_sources.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic">unknown — no provenance declared.</p>
          )}
        </div>

        <AIPanel slug={p.slug} />
      </div>
    </div>
  );
}
