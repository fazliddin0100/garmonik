import SessionAlivePoller from '@/components/auth/SessionAlivePoller';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import { Geist_Mono, Roboto } from 'next/font/google';
import './globals.css';

const roboto = Roboto({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-roboto',
  display: 'swap',
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * `icons` va boshqa keng metadata Next ichidagi yashirin `<div>`larni ko‘paytiradi —
 * tarjima kengaytmalari (translate-tooltip-mtz va h.k.) ularga yopishib hydration xatosiga olib keladi.
 * Favicon: `public/favicon.ico` yoki `app/icon.png` ishlatiladi.
 */
export const metadata: Metadata = {
  title: 'Klinika',
  description: 'Klinika boshqaruv tizimi',
  icons: { icon: '/garmonik-logo-user.png' },
  other: {
    google: 'notranslate',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      translate="no"
      className={`notranslate ${roboto.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body
        translate="no"
        className={`notranslate ${roboto.className} min-h-full flex flex-col`}
        suppressHydrationWarning>
        <SessionAlivePoller />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
