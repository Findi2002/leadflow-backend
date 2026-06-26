'use client';

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// --- auth token (localStorage) ---
export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem('eg_token'));
export const getUser = () => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('eg_user');
  return raw ? JSON.parse(raw) : null;
};
export const setSession = (token, user) => {
  localStorage.setItem('eg_token', token);
  localStorage.setItem('eg_user', JSON.stringify(user));
  window.dispatchEvent(new Event('eg_session'));
};
export const clearSession = () => {
  localStorage.removeItem('eg_token');
  localStorage.removeItem('eg_user');
  window.dispatchEvent(new Event('eg_session'));
};

// --- fetch wrapper ---
export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers.authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// --- cart (localStorage): [{id, name, price_cents, image_url, quantity}] ---
export const getCart = () => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('eg_cart') || '[]');
};
export const saveCart = (cart) => {
  localStorage.setItem('eg_cart', JSON.stringify(cart));
  window.dispatchEvent(new Event('eg_cart'));
};
export const addToCart = (product) => {
  const cart = getCart();
  const existing = cart.find((i) => i.id === product.id);
  if (existing) existing.quantity += 1;
  else cart.push({ id: product.id, name: product.name, price_cents: product.price_cents, image_url: product.image_url, quantity: 1 });
  saveCart(cart);
};
export const removeFromCart = (id) => saveCart(getCart().filter((i) => i.id !== id));
export const clearCart = () => saveCart([]);
export const money = (cents, currency = 'EUR') =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format((cents || 0) / 100);
