'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUser, getCart, clearSession } from '../lib/api';

export default function Nav() {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      setUser(getUser());
      setCartCount(getCart().reduce((n, i) => n + i.quantity, 0));
    };
    sync();
    window.addEventListener('eg_session', sync);
    window.addEventListener('eg_cart', sync);
    return () => {
      window.removeEventListener('eg_session', sync);
      window.removeEventListener('eg_cart', sync);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-evergreen-100 bg-evergreen-50/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-evergreen-600">🌿</span> Evergreen
        </Link>
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/products" className="btn-ghost border-0 hover:bg-evergreen-100">Browse</Link>
          {user?.role === 'brand' && <Link href="/brand/dashboard" className="btn-ghost border-0 hover:bg-evergreen-100">Brand</Link>}
          {user?.role === 'admin' && <Link href="/admin" className="btn-ghost border-0 hover:bg-evergreen-100">Admin</Link>}
          <Link href="/checkout" className="btn-ghost border-0 hover:bg-evergreen-100">
            Cart{cartCount > 0 && <span className="ml-1 rounded-full bg-evergreen-600 text-white px-1.5 text-xs">{cartCount}</span>}
          </Link>
          {user ? (
            <button onClick={clearSession} className="btn-ghost">Sign out</button>
          ) : (
            <Link href="/login" className="btn-primary">Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
