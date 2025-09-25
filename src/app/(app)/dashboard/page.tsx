import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { redirect } from 'next/navigation';
import { DashboardContent } from './dashboard-content';

export default async function DashboardPage() {
  const userData = await getCurrentUserAction();
  
  if (!userData) {
    redirect('/sign-in');
  }

  const { user, profile } = userData;

  return <DashboardContent user={{ ...user, profile }} />;
}
