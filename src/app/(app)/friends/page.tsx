import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { getFriendOverview, respondToFriendRequest } from '@/lib/friends/actions';
import { ensureDirectThread } from '@/lib/dm/actions';
import { redirect } from 'next/navigation';
import { FriendsPageClient } from '@/components/friends/friends-page-client';

export default async function FriendsPage() {
  const userData = await getCurrentUserAction();
  if (!userData) redirect('/sign-in');

  const overview = await getFriendOverview();
  if (overview.error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Friends</h1>
        <p className="mt-4 text-red-600">{overview.error}</p>
      </div>
    );
  }

  async function ensureDirectThreadAction(formData: FormData) {
    'use server';
    const targetUserId = String(formData.get('targetUserId') || '');
    if (!targetUserId) return;
    const { error, threadId } = await ensureDirectThread(targetUserId);
    if (!error && threadId) {
      return (await import('next/navigation')).redirect(`/dms/${threadId}`);
    }
  }

  async function respondAction(formData: FormData) {
    'use server';
    const id = String(formData.get('requestId') || '');
    const action = String(formData.get('action') || '');
    if (id && (action === 'accept' || action === 'decline')) {
      await respondToFriendRequest(id, action as any);
    }
  }

  return (
    <FriendsPageClient
      friends={overview.friends ?? []}
      incoming={(overview.incoming ?? []) as any}
      outgoing={(overview.outgoing ?? []) as any}
      ensureDirectThreadAction={ensureDirectThreadAction}
      respondAction={respondAction}
    />
  );
}


