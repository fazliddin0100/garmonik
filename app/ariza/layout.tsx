import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Qabulga ariza — Gormonik Plus',
  description:
    'Gormonik Plus klinikasiga onlayn qabul arizasi. Instagram orqali tez va oson.',
};

export default function ArizaLayout({ children }: { children: ReactNode }) {
  return children;
}
