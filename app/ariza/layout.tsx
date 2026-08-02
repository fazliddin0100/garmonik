import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Qabulga ariza',
  description: 'Klinikaga onlayn qabul arizasi.',
};

export default function ArizaLayout({ children }: { children: ReactNode }) {
  return children;
}
