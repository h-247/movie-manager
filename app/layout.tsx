import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Movie Watchlist Manager',
  description:
    'Track your personal movie watchlist with IMDb imports and To do, Doing, and Done progress.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#212121] text-[#ECECEC] min-h-screen selection:bg-neutral-700 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
