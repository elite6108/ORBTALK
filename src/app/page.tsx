import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { redirect } from 'next/navigation';
import { HomePage } from './home-page';

export default async function Home() {
  const userData = await getCurrentUserAction();

  if (userData) {
    redirect('/dashboard');
  }

  return <HomePage user={null} />;
}
