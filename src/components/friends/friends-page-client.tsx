'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { UserBasic } from '@/lib/friends/types';
import { AddFriend } from '@/components/friends/add-friend';

type IncomingReq = { id: string; requester: UserBasic };
type OutgoingReq = { id: string; addressee: UserBasic };

interface FriendsPageClientProps {
  friends: UserBasic[];
  incoming: IncomingReq[];
  outgoing: OutgoingReq[];
  ensureDirectThreadAction: (formData: FormData) => Promise<void>;
  respondAction: (formData: FormData) => Promise<void>;
}

export function FriendsPageClient({ friends, incoming, outgoing, ensureDirectThreadAction, respondAction }: FriendsPageClientProps) {
  const [tab, setTab] = useState<'all'|'online'|'pending'>('all');
  const [addOpen, setAddOpen] = useState(false);

  const shownFriends = tab === 'online' ? friends /* TODO: filter by presence when available */ : friends;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4 bg-white/70 backdrop-blur">
        <h1 className="text-xl font-semibold">Friends</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">Add Friend</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Add a friend</DialogTitle>
              <DialogDescription>Search by username to send a request.</DialogDescription>
            </DialogHeader>
            <AddFriend />
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-6 pt-4">
        <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
          <TabButton label="All" active={tab === 'all'} onClick={() => setTab('all')} />
          <TabButton label="Online" active={tab === 'online'} onClick={() => setTab('online')} />
          <TabButton label="Pending" active={tab === 'pending'} onClick={() => setTab('pending')} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab !== 'pending' ? (
          <div className="space-y-2">
            {shownFriends.length === 0 ? (
              <EmptyState text={tab === 'online' ? 'No friends online.' : 'No friends yet.'} />
            ) : (
              shownFriends.map((u) => (
                <FriendRow key={u.id} user={u} ensureDirectThreadAction={ensureDirectThreadAction} />
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-600">Incoming Requests</h2>
              <div className="mt-2 space-y-2">
                {incoming.length === 0 ? (
                  <EmptyState text="No incoming requests." />
                ) : (
                  incoming.map((r) => (
                    <form key={r.id} action={respondAction} className="flex items-center justify-between rounded-md border bg-white p-3">
                      <input type="hidden" name="requestId" value={r.id} />
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={r.requester.avatar_url || ''} alt={r.requester.display_name || r.requester.username} />
                          <AvatarFallback>{(r.requester.display_name || r.requester.username).slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.requester.display_name || r.requester.username}</div>
                          <div className="text-xs text-gray-500 truncate">@{r.requester.username}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" name="action" value="accept" className="bg-indigo-600 hover:bg-indigo-700">Accept</Button>
                        <Button type="submit" name="action" value="decline" variant="outline">Decline</Button>
                      </div>
                    </form>
                  ))
                )}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-600">Outgoing Requests</h2>
              <div className="mt-2 space-y-2">
                {outgoing.length === 0 ? (
                  <EmptyState text="No outgoing requests." />
                ) : (
                  outgoing.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-md border bg-white p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={r.addressee.avatar_url || ''} alt={r.addressee.display_name || r.addressee.username} />
                          <AvatarFallback>{(r.addressee.display_name || r.addressee.username).slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.addressee.display_name || r.addressee.username}</div>
                          <div className="text-xs text-gray-500 truncate">@{r.addressee.username}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-sm text-gray-500">{text}</div>;
}

function FriendRow({ user, ensureDirectThreadAction }: { user: UserBasic; ensureDirectThreadAction: (formData: FormData) => Promise<void> }) {
  return (
    <form action={ensureDirectThreadAction} className="flex items-center justify-between rounded-md border bg-white p-3">
      <input type="hidden" name="targetUserId" value={user.id} />
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.avatar_url || ''} alt={user.display_name || user.username} />
          <AvatarFallback>{(user.display_name || user.username).slice(0,2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-medium truncate">{user.display_name || user.username}</div>
          <div className="text-xs text-gray-500 truncate">@{user.username}</div>
        </div>
      </div>
      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Message</Button>
    </form>
  );
}





