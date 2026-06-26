'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getCart, removeFromCart, clearCart, getUser, money } from '../../lib/api';

export default function Checkout() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [ship, setShip] = useState({ shipping_name: '', shipping_address: '' });
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setCart(getCart());
    sync();
    window.addEventListener('eg_cart', sync);
    return () => window.removeEventListener('eg_cart', sync);
  }, []);

  const total = cart.reduce((s, i) => s + i.price_cents * i.quantity, 0);

  const placeOrder = async () => {
    setErr(null);
    if (!getUser()) {
      router.push('/login');
      return;
    }
    setBusy(true);
    try {
      const d = await api('/api/orders', {
        method: 'POST',
        auth: true,
        body: { items: cart.map((i) => ({ product_id: i.id, quantity: i.quantity })), ...ship },
      });
      clearCart();
      setDone(d.order);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md card p-8 text-center">
        <div className="text-4xl">🌿</div>
        <h1 className="mt-3 text-2xl font-semibold">Order confirmed</h1>
        <p className="mt-2 text-evergreen-600">Total {money(done.total_cents)} · status {done.status}</p>
        <Link href="/products" className="btn-primary mt-5">Keep browsing</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-semibold">Your cart</h1>
        {cart.length === 0 ? (
          <p className="mt-4 text-evergreen-600">Your cart is empty. <Link href="/products" className="underline">Browse products</Link>.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {cart.map((i) => (
              <div key={i.id} className="card p-4 flex items-center gap-4">
                <div className="h-14 w-14 rounded-lg bg-evergreen-100 overflow-hidden shrink-0">
                  {i.image_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-sm text-evergreen-500">{i.quantity} × {money(i.price_cents)}</p>
                </div>
                <button onClick={() => removeFromCart(i.id)} className="text-sm text-rose-500 hover:underline">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 h-fit">
        <h2 className="font-medium">Order summary</h2>
        <div className="mt-3 flex justify-between text-sm"><span>Subtotal</span><span>{money(total)}</span></div>
        <div className="mt-1 flex justify-between text-sm text-evergreen-500"><span>Shipping</span><span>Calculated at fulfillment</span></div>
        <div className="mt-3 border-t border-evergreen-100 pt-3 flex justify-between font-semibold"><span>Total</span><span>{money(total)}</span></div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Ship to (name)</label>
            <input className="input" value={ship.shipping_name} onChange={(e) => setShip({ ...ship, shipping_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={ship.shipping_address} onChange={(e) => setShip({ ...ship, shipping_address: e.target.value })} />
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-rose-500">{err}</p>}
        <button onClick={placeOrder} className="btn-primary w-full mt-4" disabled={cart.length === 0 || busy}>
          {busy ? 'Placing…' : 'Place order'}
        </button>
        <p className="mt-2 text-xs text-evergreen-400">No dark patterns. Prices are final and verified server-side.</p>
      </div>
    </div>
  );
}
