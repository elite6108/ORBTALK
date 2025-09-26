'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserMenu } from '@/components/auth/user-menu';
import { CreateServerDialog } from '@/components/servers/create-server-dialog';
import { CreateChannelDialog } from '@/components/servers/create-channel-dialog';
import { DeleteChannelButton } from '@/components/servers/delete-channel-button';
import { getUserServers, getFirstChannel, getServerChannels } from '@/lib/servers/actions';
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

interface AppSidebarProps {
  user: any;
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
  const [channelId, setChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFirstChannel = async () => {
      const { error, channelId: firstChannelId } = await getFirstChannel(server.id);
      if (!error && firstChannelId) {
        setChannelId(firstChannelId);
      } else {
        console.error('Failed to fetch first channel for server:', server.id, error);
        // This should never happen if server creation works properly
        throw new Error(`No channels found for server ${server.id}`);
      }
      setLoading(false);
    };

    fetchFirstChannel();
  }, [server.id]);

  if (loading) {
    return (
      <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse" />
    );
  }

  if (!channelId) {
    return null; // Don't render if no channel ID
  }

  const handleClick = () => {
    onSelect(server);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`w-12 h-12 rounded-full text-white relative ${
        isSelected 
          ? 'bg-indigo-600 hover:bg-indigo-700' 
          : 'bg-gray-700 hover:bg-gray-600'
      }`}
      title={server.name}
      onClick={handleClick}
    >
      <span className="text-sm font-bold">
        {server.name.charAt(0).toUpperCase()}
      </span>
    </Button>
  );
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

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
    fetchServers();
  }, []);

  useEffect(() => {
    if (selectedServer) {
      fetchChannels(selectedServer.id);
    }
  }, [selectedServer]);

  return (
    <div className="flex h-full bg-gray-900 text-white">
      {/* Server List */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-3 space-y-2">
        {/* Home Button */}
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Home className="h-6 w-6" />
          </Button>
        </Link>
        
        <div className="w-8 h-px bg-gray-600" />
        
        {/* Server Buttons */}
        {!mounted ? (
          // Show empty state during SSR to prevent hydration mismatch
          null
        ) : loading ? (
          <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse" />
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
        <CreateServerDialog onServerCreated={fetchServers}>
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 text-green-500 hover:text-green-400"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </CreateServerDialog>
      </div>

      {/* Channel List */}
      <div className="w-60 bg-gray-800 flex flex-col">
        {/* Server Header */}
        <div className="h-12 border-b border-gray-700 flex items-center px-4 shadow-sm">
          <h2 className="font-semibold text-white truncate">
            {selectedServer?.name || 'Select a Server'}
          </h2>
        </div>

        {/* Channel Categories */}
        <div className="flex-1 overflow-y-auto">
          {!selectedServer ? (
            <div className="p-4 text-center text-gray-400">
              <p>Select a server to view channels</p>
            </div>
          ) : channelsLoading ? (
            <div className="p-4 text-center text-gray-400">
              <p>Loading channels...</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <p>No channels found</p>
            </div>
          ) : (
            <>
              <div className="px-2 pt-2 pb-3 flex items-center justify-between">
                <div className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
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
                  <div className="flex items-center px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Text Channels
                  </div>
                  <div className="space-y-1 mt-1">
                    {channels.filter(c => c.type === 'text').map((channel) => (
                      <Link
                        key={channel.id}
                        href={`/servers/${selectedServer.id}/channels/${channel.id}`}
                        className="flex items-center justify-between px-2 py-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded group"
                      >
                        <div className="flex items-center min-w-0">
                          <Hash className="h-4 w-4 mr-1.5 text-gray-400" />
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
                  <div className="flex items-center px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Voice Channels
                  </div>
                  <div className="space-y-1 mt-1">
                    {channels.filter(c => c.type === 'voice').map((channel) => (
                      <Link
                        key={channel.id}
                        href={`/servers/${selectedServer.id}/channels/${channel.id}`}
                        className="flex items-center justify-between px-2 py-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded group"
                      >
                        <div className="flex items-center min-w-0">
                          <Volume2 className="h-4 w-4 mr-1.5 text-gray-400" />
                          <span className="truncate">{channel.name}</span>
                        </div>
                        <DeleteChannelButton channelId={channel.id} serverId={selectedServer.id} onDeleted={() => fetchChannels(selectedServer.id)} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* User Info */}
        <div className="h-16 bg-gray-700 border-t border-gray-600 flex items-center px-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profile?.avatar_url || ''} alt={user.profile?.display_name || ''} />
              <AvatarFallback className="bg-indigo-600 text-white text-xs">
                {user.profile?.display_name?.charAt(0) || user.profile?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user.profile?.display_name || user.profile?.username || 'User'}
              </div>
              <div className="text-xs text-gray-400 truncate">
                #{user.profile?.username || 'user'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
              <Settings className="h-4 w-4" />
            </Button>
                  <UserMenu user={user} />
          </div>
        </div>
      </div>
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
