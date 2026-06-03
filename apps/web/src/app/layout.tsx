import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import Providers from '../lib/query-provider';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['italic', 'normal'],
});

const dmsans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dmsans',
  weight: ['300', '400', '500', '700', '900'],
});

export const metadata: Metadata = {
  title: 'Phêla - Vietnamese Premium Milk Tea Shop Management',
  description: 'Artisanal Southeast-Asian milk tea and coffee administrative suite.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmsans.variable} light`}>
      <body className="font-sans bg-background text-foreground min-h-screen">
        <Providers>
          <main className="relative min-h-screen flex flex-col">{children}</main>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#FDF8F3',
                color: '#1A1A1A',
                border: '1px solid #E9DDCF',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
