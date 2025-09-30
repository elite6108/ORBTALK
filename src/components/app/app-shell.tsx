'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppHeader } from '@/components/app/app-header';
import { MemberSidebar } from '@/components/app/member-sidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Extract server ID from pathname if not provided
  const serverIdFromPath = pathname?.match(/^\/servers\/([^\/]+)/)?.[1];
  const currentServerId = initialServerId || serverIdFromPath;

  return (
    <div className="flex h-screen bg-[#313338]">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#35373c]"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar - hidden on mobile, slide in when open */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <AppSidebar 
          user={user} 
          showChannels={Boolean(isServer)} 
          initialServers={initialServers}
          initialServerId={initialServerId}
          initialChannels={initialChannels}
        />
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader user={user} />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-hidden">{children}</main>
          {/* Member sidebar - hidden on mobile */}
          {isServer && currentServerId && (
            <div className="hidden lg:block">
              <MemberSidebar serverId={currentServerId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



