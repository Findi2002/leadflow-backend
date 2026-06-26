import './globals.css';
import Nav from '../components/Nav';

export const metadata = {
  title: 'Evergreen — Transparent, sustainable products',
  description: 'A trusted marketplace for transparent, sustainable cosmetics and personal care. Every score is explainable.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-evergreen-500">
          <p>Evergreen optimizes for trust, transparency, and structured data — not maximum scale.</p>
          <p className="mt-1">Missing data is always shown as “unknown”. No black-box ratings. No health claims.</p>
        </footer>
      </body>
    </html>
  );
}
