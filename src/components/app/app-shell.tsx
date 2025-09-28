'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppHeader } from '@/components/app/app-header';
import { VoiceDock } from '@/components/voice/voice-dock';

export function AppShell({ user, children }: { user: any; children: React.ReactNode }) {
  const pathname = usePathname();
  const isServer = pathname?.startsWith('/servers/');

  return (
    <div className="flex h-screen bg-gray-100">
      <AppSidebar user={user} showChannels={Boolean(isServer)} />
      <div className="flex-1 flex flex-col">
        <AppHeader user={user} />
        <main className="flex-1 overflow-hidden">{children}</main>
        <div className="px-2 py-1">
          <VoiceDock />
        </div>
      </div>
    </div>
  );
}


