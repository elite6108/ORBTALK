import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app/app-sidebar';
import { DmSidebar } from '@/components/app/dm-sidebar';
import { headers } from 'next/headers';
import { VoiceDock } from '@/components/voice/voice-dock';
import { AppHeader } from '@/components/app/app-header';
import { AppShell } from '@/components/app/app-shell';

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

  return isDm ? (
    <div className="flex h-screen bg-gray-100">
      <DmSidebar />
      <div className="flex-1 flex flex-col">
        <AppHeader user={{ ...user, profile }} />
        <main className="flex-1 overflow-hidden">{children}</main>
        <div className="px-2 py-1">
          <VoiceDock />
        </div>
      </div>
    </div>
  ) : (
    <AppShell user={{ ...user, profile }}>{children}</AppShell>
  );
}
