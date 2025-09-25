import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ProfilePage } from './profile-page';

export default async function Profile() {
  const userData = await getCurrentUserAction();

  return (
    <ProtectedRoute user={userData?.user || null}>
      <ProfilePage user={userData?.user || null} />
    </ProtectedRoute>
  );
}
