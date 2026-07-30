'use client';

import HeadNursePortalLayout from '@/components/head-nurse/HeadNursePortalLayout';
import { HeadNurseViewProvider } from '@/components/head-nurse/HeadNurseViewContext';
import HeadNurseWorkspace from '@/components/head-nurse/HeadNurseWorkspace';
import type { ReactNode } from 'react';

export default function BoshHamshiraLayout({ children }: { children: ReactNode }) {
  return (
    <HeadNurseViewProvider defaultView="home">
      <HeadNursePortalLayout>{children}</HeadNursePortalLayout>
    </HeadNurseViewProvider>
  );
}
