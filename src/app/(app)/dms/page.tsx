import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { listMyThreads, ensureDirectThread } from '@/lib/dm/actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function DmsPage() {
  const user = await getCurrentUserAction();
  if (!user) redirect('/sign-in');

  const { error, threads } = await listMyThreads();
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Direct Messages</h1>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Direct Messages</h1>
      <div className="space-y-2">
        {(threads ?? []).map((t) => (
          <Link key={t.id} href={`/dms/${t.id}`} className="block rounded border border-gray-200 bg-white p-3 hover:bg-gray-50">
            <div className="font-medium flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gray-300" />
              <div>
                <div>{t.otherUser?.display_name ?? t.otherUser?.username ?? 'Direct Message'}</div>
                {t.otherUser && <div className="text-xs text-gray-500">@{t.otherUser.username}</div>}
              </div>
            </div>
          </Link>
        ))}
        {(threads ?? []).length === 0 && (
          <div className="text-gray-500">No conversations yet.</div>
        )}
      </div>
    </div>
  );
}


