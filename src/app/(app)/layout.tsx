import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppHeader } from '@/components/app/app-header';

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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AppSidebar user={{ ...user, profile }} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <AppHeader user={{ ...user, profile }} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
