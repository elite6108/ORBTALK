import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app/app-sidebar';
import { DmSidebar } from '@/components/app/dm-sidebar';
import { headers } from 'next/headers';
import { AppHeader } from '@/components/app/app-header';
import { AppShell } from '@/components/app/app-shell';
import { listMyThreads } from '@/lib/dm/actions';
import { getUserServers, getServerChannels } from '@/lib/servers/actions';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userData = await getCurrentUserAction();
  
  if (!userData) {
    redirect('/sign-in');
  }

  const { user, profile } = userData;

  const h = await headers();
  const path = h.get('x-invoke-path') || '';
  const isDm = path.startsWith('/dms');

  // Preload servers and (if applicable) channels for the current server route
  let initialServers: any[] | undefined = undefined;
  let initialChannels: any[] | undefined = undefined;
  let initialServerId: string | undefined = undefined;

  const serversRes = await getUserServers();
  if (!serversRes.error) {
    initialServers = serversRes.servers || [];
  }

  const serverMatch = path.match(/^\/servers\/([\w-]+)/);
  if (serverMatch && serverMatch[1]) {
    initialServerId = serverMatch[1];
    const channelsRes = await getServerChannels(initialServerId);
    if (!channelsRes.error) {
      initialChannels = channelsRes.channels || [];
    }
  }

  // Preload DM threads when on DM routes
  let initialThreads: any[] | undefined = undefined;
  if (isDm) {
    const t = await listMyThreads();
    if (!t.error) {
      initialThreads = t.threads || [];
    }
  }

  return isDm ? (
    <div className="flex h-screen bg-[#313338]">
      <DmSidebar initialThreads={initialThreads} />
      <div className="flex-1 flex flex-col">
        <AppHeader user={{ ...user, profile }} />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  ) : (
    <AppShell 
      user={{ ...user, profile }}
      initialServers={initialServers}
      initialServerId={initialServerId}
      initialChannels={initialChannels}
    >
      {children}
    </AppShell>
  );
}
