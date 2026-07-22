import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import Providers from '../lib/query-provider';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { GlobalMarketingListener } from '@/components/GlobalMarketingListener';

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
  title: 'Phêla - Cửa hàng đặt đồ uống cao cấp',
  description: 'Thưởng thức trà sữa ô long thượng hạng và cà phê trứng Phêla.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${playfair.variable} ${dmsans.variable} light`}>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
      </head>
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
          <GlobalMarketingListener />
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
