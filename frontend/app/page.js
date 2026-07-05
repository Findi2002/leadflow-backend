'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  useEffect(() => {
    api('/api/products?sort=transparency&page_size=3').then((d) => setFeatured(d.items)).catch(() => {});
  }, []);

  return (
    <div className="space-y-16">
      <section className="text-center py-12">
        <p className="text-sm font-medium text-evergreen-600">Trusted commerce, not aggressive scaling</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
          Know exactly what you’re buying.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-evergreen-600">
          A marketplace for transparent, sustainable cosmetics and personal care. Every product is
          structured, sourced, and scored — and when data is missing, we say so.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/products" className="btn-primary">Browse products</Link>
          <Link href="/register" className="btn-ghost">Sell on Evergreen</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['Structured, not vague', 'Ingredients, certifications, packaging and origin are real fields — not marketing copy.'],
          ['Explainable scores', 'Every transparency and sustainability score expands to show exactly how it was calculated.'],
          ['Honest about gaps', '“Unknown” is a first-class answer. We never invent data to look more complete.'],
        ].map(([t, d]) => (
          <div key={t} className="card p-6">
            <h3 className="font-medium">{t}</h3>
            <p className="mt-2 text-sm text-evergreen-600">{d}</p>
          </div>
        ))}
      </section>

      {featured.length > 0 && (
        <section>
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold">Most transparent right now</h2>
            <Link href="/products" className="text-sm text-evergreen-600 hover:underline">View all →</Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
