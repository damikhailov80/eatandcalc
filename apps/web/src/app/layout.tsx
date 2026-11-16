import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-body' });
const manrope = Manrope({ subsets: ['latin', 'cyrillic'], weight: ['700', '800'], variable: '--font-heading' });

export const metadata: Metadata = {
  title: 'Eat And Calc — питание семьи',
  description: 'Приложение для Android: готовка, кто сколько съел и дневные нормы КБЖУ всей семьи.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#F6F4EF' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
