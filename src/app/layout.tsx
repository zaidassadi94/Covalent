import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';

export const metadata: Metadata = {
  title: 'Covalent — Invoicing & Receivables',
  description: 'Purpose-built invoicing and receivables management for Covalent General Trading LLC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#fafafa] antialiased">
        <Sidebar />
        <main className="ml-[260px] min-h-screen transition-all duration-300">
          <div className="mx-auto max-w-7xl px-8 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
