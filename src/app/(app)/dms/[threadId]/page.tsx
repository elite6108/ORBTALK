import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { getThreadMessages, sendDmMessage } from '@/lib/dm/actions';
import { DmThreadClient } from '@/components/dms/dm-thread-client';
import { redirect } from 'next/navigation';

export default async function DmThreadPage(props: { params: Promise<{ threadId: string }> }) {
  const params = await props.params;
  const user = await getCurrentUserAction();
  if (!user) redirect('/sign-in');

  const initial = await getThreadMessages(params.threadId, 50, 0);
  const { otherUser } = initial;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shadow-sm">
        <div className="font-semibold text-gray-900">{otherUser?.display_name ?? otherUser?.username ?? 'Direct Message'}</div>
        {otherUser?.username && <div className="ml-2 text-sm text-gray-500">@{otherUser.username}</div>}
      </div>

      <DmThreadClient threadId={params.threadId} currentUserId={user.user.id} />
    </div>
  );
}

// Client messages list moved to components/dms/dm-messages-client.tsx


