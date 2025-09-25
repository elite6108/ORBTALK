'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  user: any;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

export function ProtectedRoute({ 
  children, 
  user,
  requireAdmin = false, 
  requireModerator = false 
}: ProtectedRouteProps) {
  const profile = user?.profile;
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/sign-in');
      return;
    }

    if (profile?.is_banned) {
      router.push('/banned');
      return;
    }

    if (requireAdmin && !profile?.is_admin) {
      router.push('/unauthorized');
      return;
    }

    if (requireModerator && !profile?.is_moderator && !profile?.is_admin) {
      router.push('/unauthorized');
      return;
    }
  }, [user, profile, requireAdmin, requireModerator, router]);

  if (!user) {
    return null;
  }

  if (profile?.is_banned) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Account Banned</h1>
          <p className="text-gray-600 mb-4">
            Your account has been banned from this service.
          </p>
          {profile.ban_reason && (
            <p className="text-sm text-gray-500">
              Reason: {profile.ban_reason}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (requireAdmin && !profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (requireModerator && !profile?.is_moderator && !profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You need moderator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
