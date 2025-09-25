import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { redirect } from 'next/navigation';
import { ServersContent } from './servers-content';

export default async function ServersPage() {
  const userData = await getCurrentUserAction();
  
  if (!userData) {
    redirect('/sign-in');
  }

  const { user, profile } = userData;

  return <ServersContent user={{ ...user, profile }} />;
}
