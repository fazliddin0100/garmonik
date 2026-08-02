import OshxonaPortalLayout from '@/components/kitchen/OshxonaPortalLayout';
import type { ReactNode } from 'react';

export default function OshxonaLayout({ children }: { children: ReactNode }) {
  return <OshxonaPortalLayout>{children}</OshxonaPortalLayout>;
}
