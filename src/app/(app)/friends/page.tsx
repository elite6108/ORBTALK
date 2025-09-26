import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { getFriendOverview, respondToFriendRequest } from '@/lib/friends/actions';
import { ensureDirectThread } from '@/lib/dm/actions';
import { AddFriend } from '@/components/friends/add-friend';
import { redirect } from 'next/navigation';

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

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Friends</h1>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(overview.friends ?? []).map((u) => (
            <form key={u.id} className="rounded border border-gray-200 bg-white p-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{u.display_name ?? u.username}</div>
                <div className="text-xs text-gray-500">@{u.username}</div>
              </div>
              <button
                formAction={async () => {
                  'use server';
                  const { error, threadId } = await ensureDirectThread(u.id);
                  if (!error && threadId) {
                    // redirect to the DM thread
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore next/navigation redirect in server action
                    return (await import('next/navigation')).redirect(`/dms/${threadId}`);
                  }
                }}
                className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
              >Message</button>
            </form>
          ))}
          {(overview.friends ?? []).length === 0 && (
            <div className="text-gray-500">No friends yet.</div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Incoming Requests</h2>
        <div className="mt-3 space-y-2">
          {(overview.incoming ?? []).map((r) => (
            <form key={r.id} className="flex items-center justify-between rounded border border-gray-200 bg-white p-3">
              <div>
                <div className="font-medium">{r.requester.display_name ?? r.requester.username}</div>
                <div className="text-xs text-gray-500">@{r.requester.username}</div>
              </div>
              <div className="flex gap-2">
                <button
                  formAction={async () => {
                    'use server';
                    await respondToFriendRequest(r.id, 'accept');
                  }}
                  className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >Accept</button>
                <button
                  formAction={async () => {
                    'use server';
                    await respondToFriendRequest(r.id, 'decline');
                  }}
                  className="px-3 py-1 rounded bg-gray-100 text-gray-900 hover:bg-gray-200"
                >Decline</button>
              </div>
            </form>
          ))}
          {(overview.incoming ?? []).length === 0 && (
            <div className="text-gray-500">No incoming requests.</div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Outgoing Requests</h2>
        <div className="mt-3 space-y-2">
          {(overview.outgoing ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded border border-gray-200 bg-white p-3">
              <div>
                <div className="font-medium">{r.addressee.display_name ?? r.addressee.username}</div>
                <div className="text-xs text-gray-500">@{r.addressee.username}</div>
              </div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          ))}
          {(overview.outgoing ?? []).length === 0 && (
            <div className="text-gray-500">No outgoing requests.</div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Add Friend</h2>
        <div className="mt-3">
          <AddFriend />
        </div>
      </div>
    </div>
  );
}


