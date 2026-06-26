'use client';
import { useState } from 'react';

// An explainable score: a labeled bar that expands to show every factor that
// produced it. No black boxes — this component is the heart of the UX promise.
export default function ScoreBar({ label, score, breakdown, accent = 'evergreen' }) {
  const [open, setOpen] = useState(false);
  const value = score == null ? null : score;
  const color =
    value == null ? 'bg-gray-300' : value >= 75 ? 'bg-evergreen-600' : value >= 45 ? 'bg-amber-500' : 'bg-rose-400';

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-evergreen-700">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {value == null ? 'unknown' : `${value}/100`}
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full rounded-full bg-evergreen-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value || 0}%` }} />
      </div>
      {Array.isArray(breakdown) && breakdown.length > 0 && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-3 text-xs font-medium text-evergreen-600 hover:underline"
          >
            {open ? 'Hide' : 'Why this score?'} ({breakdown.length} factors)
          </button>
          {open && (
            <ul className="mt-2 space-y-1.5">
              {breakdown.map((f, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <span className="font-medium text-evergreen-800">{f.label}</span>
                    <p className="text-evergreen-500">{f.reason}</p>
                  </div>
                  <span
                    className={`shrink-0 tabular-nums font-semibold ${
                      f.awarded === 0 ? 'text-rose-400' : 'text-evergreen-600'
                    }`}
                  >
                    {f.awarded}/{f.possible}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
