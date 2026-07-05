'use client';
import Link from 'next/link';
import { money } from '../lib/api';

const Pill = ({ score, label }) => {
  const v = score == null ? null : score;
  const color = v == null ? 'bg-gray-100 text-gray-500' : v >= 75 ? 'bg-evergreen-100 text-evergreen-700' : v >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {label} {v == null ? 'unknown' : v}
    </span>
  );
};

export default function ProductCard({ p }) {
  return (
    <Link href={`/products/${p.slug}`} className="card overflow-hidden hover:shadow-md transition group">
      <div className="aspect-[4/3] bg-evergreen-100 overflow-hidden">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="flex h-full items-center justify-center text-evergreen-300 text-sm">No image</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-xs text-evergreen-500">
          {p.brand_name}
          {p.brand_verification === 'verified' && (
            <span title="Verified brand" className="text-evergreen-600">✓</span>
          )}
        </div>
        <h3 className="mt-1 font-medium leading-snug">{p.name}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Pill label="Transparency" score={p.transparency_score} />
          <Pill label="Sustainability" score={p.sustainability_score} />
        </div>
        <div className="mt-3 font-semibold">{money(p.price_cents, p.currency)}</div>
      </div>
    </Link>
  );
}
