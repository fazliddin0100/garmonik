'use client';

import AppointmentRequestsPanel from '@/components/appointment-requests/AppointmentRequestsPanel';
import QueueLivePanel from '@/components/queue/QueueLivePanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function KabinetQueuePanel() {
  return (
    <Tabs defaultValue="online" className="space-y-4">
      <TabsList>
        <TabsTrigger value="online">Onlayn navbat</TabsTrigger>
        <TabsTrigger value="live">Klinika navbati</TabsTrigger>
      </TabsList>
      <TabsContent value="online" className="mt-0">
        <AppointmentRequestsPanel variant="kabinet" />
      </TabsContent>
      <TabsContent value="live" className="mt-0">
        <QueueLivePanel listOnly />
      </TabsContent>
    </Tabs>
  );
}
