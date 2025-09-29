import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { redirect } from 'next/navigation';
import { DashboardContent } from './dashboard-content';
import { getDashboardStats, getUserTasks, getRecentActivity } from '@/lib/dashboard/actions';

export default async function DashboardPage() {
  const userData = await getCurrentUserAction();
  
  if (!userData) {
    redirect('/sign-in');
  }

  const { user, profile } = userData;

  // Fetch dashboard data
  const [statsResult, tasksResult, activityResult] = await Promise.all([
    getDashboardStats(),
    getUserTasks(),
    getRecentActivity()
  ]);

  return (
    <DashboardContent 
      user={{ ...user, profile }}
      initialStats={statsResult.stats}
      initialTasks={tasksResult.tasks || []}
      initialActivities={activityResult.activities || []}
    />
  );
}
