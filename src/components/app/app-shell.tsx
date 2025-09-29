'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppHeader } from '@/components/app/app-header';
import { MemberSidebar } from '@/components/app/member-sidebar';

export function AppShell({ 
  user, 
  children,
  initialServers,
  initialServerId,
  initialChannels,
}: { 
  user: any; 
  children: React.ReactNode;
  initialServers?: any[];
  initialServerId?: string;
  initialChannels?: any[];
}) {
  const pathname = usePathname();
  const isServer = pathname?.startsWith('/servers/');
  
  // Extract server ID from pathname if not provided
  const serverIdFromPath = pathname?.match(/^\/servers\/([^\/]+)/)?.[1];
  const currentServerId = initialServerId || serverIdFromPath;

  return (
    <div className="flex h-screen bg-[#313338]">
      <AppSidebar 
        user={user} 
        showChannels={Boolean(isServer)} 
        initialServers={initialServers}
        initialServerId={initialServerId}
        initialChannels={initialChannels}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader user={user} />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-hidden">{children}</main>
          {isServer && currentServerId && (
            <MemberSidebar serverId={currentServerId} />
          )}
        </div>
      </div>
    </div>
  );
}



