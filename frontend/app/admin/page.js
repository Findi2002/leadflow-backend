'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '../../lib/api';

export default function Admin() {
  const router = useRouter();
  const [brands, setBrands] = useState([]);
  const [pending, setPending] = useState([]);
  const [msg, setMsg] = useState(null);

  const refresh = async () => {
    try {
      const b = await api('/api/admin/brands', { auth: true });
      setBrands(b.items);
      const p = await api('/api/admin/products?status=pending_review', { auth: true });
      setPending(p.items);
    } catch (e) { setMsg(e.message); }
  };

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    if (u.role !== 'admin') { router.push('/'); return; }
    refresh();
  }, []);

  const verify = async (id, status) => {
    await api(`/api/admin/brands/${id}/verification`, { method: 'PATCH', auth: true, body: { status } });
    refresh();
  };
  const moderate = async (id, decision) => {
    await api(`/api/admin/products/${id}/moderate`, { method: 'PATCH', auth: true, body: { decision } });
    refresh();
  };
  const rescoreAll = async () => {
    const d = await api('/api/admin/rescore-all', { method: 'POST', auth: true });
    setMsg(`Rescored ${d.rescored} published products against the active rules.`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <button onClick={rescoreAll} className="btn-ghost text-sm">Re-score all products</button>
      </div>
      {msg && <div className="card p-3 text-sm">{msg}</div>}

      <section>
        <h2 className="font-medium mb-3">Brand verification</h2>
        <div className="grid gap-3">
          {brands.map((b) => (
            <div key={b.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-sm text-evergreen-500">{b.country || 'country unknown'} · status: {b.verification_status}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => verify(b.id, 'verified')} className="btn-ghost text-xs py-1.5 px-3">Verify</button>
                <button onClick={() => verify(b.id, 'rejected')} className="text-xs text-rose-500 px-2">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-3">Products awaiting review ({pending.length})</h2>
        <div className="grid gap-3">
          {pending.length === 0 && <p className="text-sm text-evergreen-500">Nothing in the queue.</p>}
          {pending.map((p) => (
            <div key={p.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{p.name} <span className="text-xs text-evergreen-400">· {p.brand_name}</span></p>
                <p className="text-sm text-evergreen-500">transparency {p.transparency_score ?? '—'} · sustainability {p.sustainability_score ?? '—'} · sources: {p.data_sources?.length || 0}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => moderate(p.id, 'publish')} className="btn-primary text-xs py-1.5 px-3">Publish</button>
                <button onClick={() => moderate(p.id, 'reject')} className="text-xs text-rose-500 px-2">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
