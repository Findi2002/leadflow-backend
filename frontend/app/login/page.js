'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setSession } from '../../lib/api';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const d = await api('/api/auth/login', { method: 'POST', body: form });
      setSession(d.token, d.user);
      router.push(d.user.role === 'brand' ? '/brand/dashboard' : d.user.role === 'admin' ? '/admin' : '/products');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={submit} className="card p-6 mt-4 space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {err && <p className="text-sm text-rose-500">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="mt-3 text-sm text-evergreen-600">
        No account? <Link href="/register" className="underline">Create one</Link>
      </p>
      <p className="mt-2 text-xs text-evergreen-400">Demo: shopper@example.com / admin@evergreen.market / hello@purepetal.eco — password evergreen123</p>
    </div>
  );
}
