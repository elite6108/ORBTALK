'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserMenu } from '@/components/auth/user-menu';
import { VoiceDock } from '@/components/voice/voice-dock';
import { CreateServerDialog } from '@/components/servers/create-server-dialog';
import { JoinServerDialog } from '@/components/servers/join-server-dialog';
import { CreateChannelDialog } from '@/components/servers/create-channel-dialog';
import { DeleteChannelButton } from '@/components/servers/delete-channel-button';
import { getUserServers, getFirstChannel, getServerChannels } from '@/lib/servers/actions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ServerSettingsDialog } from '@/components/servers/server-settings-dialog';
import { getMyServerMembership, deleteServer } from '@/lib/servers/actions';
import { SendInviteDialog } from '@/components/servers/send-invite-dialog';
import type { Server } from '@/lib/servers/types';
import {
  Plus,
  Hash,
  Volume2,
  Settings,
  Users,
  MessageSquare,
  Home,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

interface AppSidebarProps {
  user: any;
  showChannels?: boolean;
  initialServers?: Server[];
  initialServerId?: string;
  initialChannels?: any[];
}

// Server button component that handles server selection
function ServerButton({ 
  server, 
  isSelected, 
  onSelect 
}: { 
  server: Server; 
  isSelected: boolean;
  onSelect: (server: Server) => void;
}) {
  const router = useRouter();
  const [channelId, setChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const openViaContext = useRef(false);

  useEffect(() => {
    // Avoid fetching the channel client-side; we link to /servers/[serverId]
    // which SSR-redirects to the first channel. Keep a minimal loading state
    // to maintain button skeletons during hydration.
    setChannelId('placeholder');
    setLoading(false);
    setMounted(true);
  }, [server.id]);

  if (loading) {
    return (
      <div className="w-12 h-12 rounded-full bg-[#313338] animate-pulse" />
    );
  }

  if (!channelId) {
    return null; // Don't render if no channel ID
  }

  const handleClick = () => {
    onSelect(server);
    // Route to server; server page redirects to first channel server-side
    router.push(`/servers/${server.id}`);
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openViaContext.current = true;
    setMenuOpen(true);
    // Reset the flag after this tick to only allow opens initiated by right-click
    setTimeout(() => { openViaContext.current = false; }, 0);
  };

  const copyText = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {}
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch {}
  };

  return (
    <>
      {mounted ? (
        <>
          <DropdownMenu open={menuOpen} onOpenChange={(next) => {
            if (next && !openViaContext.current) {
              // Ignore attempts to open via left click/keyboard
              return;
            }
            setMenuOpen(next);
          }}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`w-12 h-12 rounded-full text-white relative ${
                  isSelected 
                    ? 'bg-[#5865f2] hover:bg-[#4752c4]' 
                    : 'bg-[#313338] hover:bg-[#5865f2]'
                }`}
                title={server.name}
                onClick={handleClick}
                onContextMenu={onContextMenu}
              >
                <span className="text-sm font-bold">
                  {server.name.charAt(0).toUpperCase()}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={6} align="start">
              <DropdownMenuItem onSelect={() => { setInviteOpen(true); setMenuOpen(false); }}>
                Send Invite…
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copyText(server.invite_code)}>
                Copy Invite Code
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copyText(`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${server.invite_code}`)}>
                Copy Invite Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <SendInviteDialog serverId={server.id} inviteCode={server.invite_code} open={inviteOpen} onOpenChange={setInviteOpen} />
        </>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className={`w-12 h-12 rounded-full text-white relative ${
            isSelected 
              ? 'bg-[#5865f2] hover:bg-[#4752c4]' 
              : 'bg-[#313338] hover:bg-[#5865f2]'
          }`}
          title={server.name}
          onClick={handleClick}
        >
          <span className="text-sm font-bold">
            {server.name.charAt(0).toUpperCase()}
          </span>
        </Button>
      )}
    </>
  );
}

export function AppSidebar({ user, showChannels, initialServers, initialServerId, initialChannels }: AppSidebarProps) {
  const [servers, setServers] = useState<Server[]>(initialServers ?? []);
  const [loading, setLoading] = useState(!initialServers);
  const [mounted, setMounted] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(
    initialServers && initialServerId ? (initialServers.find(s => s.id === initialServerId) ?? initialServers[0] ?? null) : null
  );
  const [channels, setChannels] = useState<any[]>(initialChannels ?? []);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const pathnameForSidebar = usePathname();
  const shouldShowChannels = typeof showChannels === 'boolean' ? showChannels : Boolean(pathnameForSidebar?.startsWith('/servers/'));

  const fetchServers = async () => {
    const { error, servers: userServers } = await getUserServers();
    if (!error && userServers) {
      setServers(userServers);
      // Select the first server by default
      if (userServers.length > 0 && !selectedServer) {
        setSelectedServer(userServers[0]);
      }
    }
    setLoading(false);
  };

  const fetchChannels = async (serverId: string) => {
    setChannelsLoading(true);
    try {
      const { error, channels: channelsData } = await getServerChannels(serverId);

      if (error) {
        console.error('Error fetching channels:', error);
        setChannels([]);
      } else {
        setChannels(channelsData || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching channels:', error);
      setChannels([]);
    } finally {
      setChannelsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (!initialServers) {
      fetchServers();
    } else {
      setLoading(false);
    }
  }, [initialServers]);

  // Keep servers in sync with incoming initialServers when navigating between routes on the client
  useEffect(() => {
    if (initialServers) {
      setServers(initialServers);
    }
  }, [initialServers]);

  useEffect(() => {
    const match = pathnameForSidebar?.match(/^\/servers\/([\w-]+)/);
    const activeServerId = match && match[1] ? match[1] : undefined;
    if (activeServerId && servers.length) {
      const found = servers.find(s => s.id === activeServerId) || servers[0] || null;
      setSelectedServer(found);
    }
  }, [pathnameForSidebar, servers]);

  // Also honor initialServerId from server props when it changes across navigations
  useEffect(() => {
    if (initialServerId && servers.length) {
      const found = servers.find(s => s.id === initialServerId) || servers[0] || null;
      setSelectedServer(found);
    }
  }, [initialServerId, servers]);

  useEffect(() => {
    if (selectedServer) {
      if (initialServerId === selectedServer.id && initialChannels) {
        setChannels(initialChannels);
        setChannelsLoading(false);
        return;
      }
      // Clear channels immediately to avoid showing channels from previous server
      setChannels([]);
      fetchChannels(selectedServer.id);
    }
  }, [selectedServer]);

  return (
    <div className="flex h-full bg-[#2b2d31] text-[#f2f3f5]">
      {/* Server List */}
      <div className="w-16 bg-[#1e1f22] flex flex-col items-center py-3 space-y-2 border-r border-black/20">
        {/* Home Button */}
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-[#5865f2] text-white hover:bg-[#4752c4] hover:rounded-2xl transition-all duration-200"
          >
            <Home className="h-6 w-6" />
          </Button>
        </Link>
        
        <div className="w-8 h-px bg-[#3f4147]" />
        
        {/* Friends Button */}
        <Link href="/friends">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-[#313338] text-[#23a559] hover:bg-[#23a559] hover:text-white hover:rounded-2xl transition-all duration-200"
            title="Friends"
          >
            <Users className="h-6 w-6" />
          </Button>
        </Link>

        <div className="w-8 h-px bg-[#3f4147]" />

        {/* DMs Button */}
        <Link href="/dms">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-[#313338] text-white hover:bg-[#5865f2] hover:rounded-2xl transition-all duration-200"
            title="Direct Messages"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </Link>

        <div className="w-8 h-px bg-[#3f4147]" />

        {/* Server Buttons */}
        {!mounted ? (
          // Show empty state during SSR to prevent hydration mismatch
          null
        ) : loading ? (
          <div className="w-12 h-12 rounded-full bg-[#313338] animate-pulse" />
        ) : (
          servers.map((server) => (
            <ServerButton 
              key={server.id} 
              server={server} 
              isSelected={selectedServer?.id === server.id}
              onSelect={setSelectedServer}
            />
          ))
        )}
        
        {/* Add Server Button */}
        {mounted && (
          <CreateServerDialog onServerCreated={fetchServers}>
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-full bg-[#313338] text-[#23a559] hover:bg-[#23a559] hover:text-white hover:rounded-2xl transition-all duration-200"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </CreateServerDialog>
        )}

        {/* Join Server Button */}
        {mounted && (
          <JoinServerDialog>
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-full bg-[#313338] text-[#23a559] hover:bg-[#23a559] hover:text-white hover:rounded-2xl transition-all duration-200"
              title="Join a Server"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Button>
          </JoinServerDialog>
        )}
      </div>

      {/* Channel List */}
      {shouldShowChannels && (
      <div className="w-60 bg-[#2b2d31] flex flex-col border-r border-black/20">
        {/* Server Header (click -> settings) */}
        <div className="h-12 border-b border-black/30 flex items-center px-4 shadow-md">
          {selectedServer ? (
            <div className="w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="font-semibold text-[#f2f3f5] truncate text-left hover:underline">
                    {selectedServer.name}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={6}>
                  <DropdownMenuItem asChild>
                    <Link href={`/servers/${selectedServer.id}`}>Go to Server</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/servers/${selectedServer.id}/channels/${channels.find(c=>c.type==='text')?.id || ''}`}>First Text Channel</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={async () => {
                    const { canManageServer } = await getMyServerMembership(selectedServer.id);
                    if (canManageServer) {
                      // open settings dialog programmatically not supported; render inline
                    }
                  }} disabled>
                    Server Settings…
                  </DropdownMenuItem>
                  {/* Inline settings dialog trigger for authorized users */}
                  <div className="px-2 py-1">
                    <ServerSettingsDialog
                      serverId={selectedServer.id}
                      serverName={selectedServer.name}
                      serverIconUrl={selectedServer.icon_url}
                      trigger={<Button variant="outline" size="sm" className="w-full">Open Settings</Button>}
                    />
                  </div>
                  <DropdownMenuItem onSelect={async () => {
                    try {
                      const { error } = await deleteServer(selectedServer.id);
                      if (!error) {
                        window.location.href = '/servers';
                      }
                    } catch {}
                  }}>
                    Delete Server (owner)
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <form action="/api/servers/leave" method="post">
                      <input type="hidden" name="serverId" value={selectedServer.id} />
                      <button type="submit" className="w-full text-left">Leave Server</button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <h2 className="font-semibold text-[#f2f3f5] truncate">Select a Server</h2>
          )}
        </div>

        {/* Channel Categories */}
        <div className="flex-1 overflow-y-auto">
          {!selectedServer ? (
            <div className="p-4 text-center text-[#949ba4]">
              <p>Select a server to view channels</p>
            </div>
          ) : channelsLoading && channels.length === 0 ? (
            // Keep space but avoid flashing a loading message when we have initial data
            <div className="p-4 text-center text-[#949ba4] min-h-8" />
          ) : channels.length === 0 ? (
            <div className="p-4 text-center text-[#949ba4]">
              <p>No channels found</p>
            </div>
          ) : (
            <>
              <div className="px-2 pt-2 pb-3 flex items-center justify-between">
                <div className="flex items-center text-xs font-semibold text-[#949ba4] uppercase tracking-wide">
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Channels
                </div>
                {selectedServer && (
                  <CreateChannelDialog serverId={selectedServer.id} onCreated={() => fetchChannels(selectedServer.id)} />
                )}
              </div>

              {/* Text Channels */}
              {channels.filter(c => c.type === 'text').length > 0 && (
                <div className="px-2 py-2">
                  <div className="flex items-center px-2 py-1 text-xs font-semibold text-[#949ba4] uppercase tracking-wide">
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Text Channels
                  </div>
                  <div className="space-y-1 mt-1">
                    {channels.filter(c => c.type === 'text').map((channel) => (
                      <Link
                        key={channel.id}
                        href={`/servers/${selectedServer.id}/channels/${channel.id}`}
                        className="flex items-center justify-between px-2 py-1.5 text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#404249] rounded group"
                      >
                        <div className="flex items-center min-w-0">
                          <Hash className="h-4 w-4 mr-1.5 text-[#80848e]" />
                          <span className="truncate">{channel.name}</span>
                        </div>
                        <DeleteChannelButton channelId={channel.id} serverId={selectedServer.id} onDeleted={() => fetchChannels(selectedServer.id)} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Voice Channels */}
              {channels.filter(c => c.type === 'voice').length > 0 && (
                <div className="px-2 py-2">
                  <div className="flex items-center px-2 py-1 text-xs font-semibold text-[#949ba4] uppercase tracking-wide">
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Voice Channels
                  </div>
                  <div className="space-y-2 mt-1">
                    {channels.filter(c => c.type === 'voice').map((channel) => (
                      <div key={channel.id} className="">
                        <Link
                          href={`/servers/${selectedServer.id}/channels/${channel.id}`}
                          className="flex items-center justify-between px-2 py-1.5 text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#404249] rounded group"
                        >
                          <div className="flex items-center min-w-0">
                            <Volume2 className="h-4 w-4 mr-1.5 text-[#80848e]" />
                            <span className="truncate">{channel.name}</span>
                          </div>
                          <DeleteChannelButton channelId={channel.id} serverId={selectedServer.id} onDeleted={() => fetchChannels(selectedServer.id)} />
                        </Link>
                        {/* Inline participants */}
                        <VoiceInlineParticipants serverId={selectedServer.id} channelId={channel.id} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Voice Dock - positioned above user info */}
        <VoiceDock />

        {/* User Info */}
        <div className="h-16 bg-[#232428] border-t border-black/30 flex items-center px-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profile?.avatar_url || ''} alt={user.profile?.display_name || ''} />
              <AvatarFallback className="bg-[#5865f2] text-white text-xs">
                {user.profile?.display_name?.charAt(0) || user.profile?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#f2f3f5] truncate">
                {user.profile?.display_name || user.profile?.username || 'User'}
              </div>
              <div className="text-xs text-[#949ba4] truncate">
                #{user.profile?.username || 'user'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#35373c]">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#35373c]">
              <Settings className="h-4 w-4" />
            </Button>
                  <UserMenu user={user} />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function VoiceInlineParticipants({ serverId, channelId }: { serverId: string; channelId: string }) {
  const pathname = usePathname();
  const [people, setPeople] = useState<{ id: string; name: string; audioEnabled: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/livekit/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, channelId }),
      });
      const data = await res.json();
      setPeople(data.participants || []);
    } catch (e) {
      setPeople([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only poll LiveKit when viewing server routes; avoid Friends/DMs
    const isServerRoute = pathname?.startsWith('/servers/');
    if (!isServerRoute) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [serverId, channelId, pathname]);

  if (loading && people.length === 0) {
    return <div className="px-8 py-1 text-xs text-gray-500">Checking…</div>;
  }
  if (people.length === 0) {
    return null;
  }
  return (
    <div className="pl-8 pr-2 pb-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-400">
      {people.slice(0, 6).map((p) => (
        <div key={p.id} className="flex items-center gap-1">
          <div className={`h-2 w-2 rounded-full ${p.audioEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="truncate max-w-[100px]">{p.name}</span>
        </div>
      ))}
      {people.length > 6 && (
        <span>+{people.length - 6}</span>
      )}
    </div>
  );
}
