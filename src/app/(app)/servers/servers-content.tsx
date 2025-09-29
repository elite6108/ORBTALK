'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateServerDialog } from '@/components/servers/create-server-dialog';
import { JoinServerDialog } from '@/components/servers/join-server-dialog';
import { getUserServers } from '@/lib/servers/actions';
import type { Server } from '@/lib/servers/types';
import { 
  Plus, 
  Hash, 
  Volume2, 
  Users, 
  Settings, 
  Crown,
  Search,
  Filter
} from 'lucide-react';

interface ServersContentProps {
  user: any;
}

// Server card component that fetches the first channel ID
function ServerCard({ server, user }: { server: Server; user: any }) {
  return (
    <Link href={`/servers/${server.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg w-12 h-12 flex items-center justify-center">
                <span className="text-indigo-600 font-bold text-lg">
                  {server.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <CardTitle className="text-lg">{server.name}</CardTitle>
                {server.owner_id === user.id && (
                  <div className="flex items-center text-xs text-amber-600 mt-1">
                    <Crown className="h-3 w-3 mr-1" />
                    Owner
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="mt-2">
            {server.description || 'No description available'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {server.member_count} members
                </div>
                <div className="flex items-center">
                  <Hash className="h-4 w-4 mr-1" />
                  Channels
                </div>
              </div>
              <span>{new Date(server.created_at).toLocaleDateString()}</span>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                View Server
              </Button>
              {server.owner_id === user.id && (
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ServersContent({ user }: ServersContentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async () => {
    setLoading(true);
    setError(null);
    
    const { error: fetchError, servers: userServers } = await getUserServers();
    
    if (fetchError) {
      setError(fetchError);
    } else {
      setServers(userServers || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const filteredServers = servers.filter(server =>
    server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (server.description && server.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Servers</h1>
          <p className="text-gray-600">
            Manage your communities and discover new ones.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search servers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <div className="flex gap-2">
            <JoinServerDialog />
            <CreateServerDialog onServerCreated={fetchServers} />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your servers...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Hash className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading servers</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        )}

        {/* Server Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServers.map((server) => (
              <ServerCard key={server.id} server={server} user={user} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredServers.length === 0 && (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Hash className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No servers found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'You haven\'t joined any servers yet.'}
            </p>
            <div className="flex gap-2 justify-center">
              <CreateServerDialog onServerCreated={fetchServers} />
              <JoinServerDialog />
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {!loading && !error && (
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Server Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{servers.length}</div>
                    <div className="text-sm text-gray-500">Total Servers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {servers.reduce((acc, server) => acc + server.member_count, 0)}
                    </div>
                    <div className="text-sm text-gray-500">Total Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {servers.length * 3}
                    </div>
                    <div className="text-sm text-gray-500">Total Channels</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {servers.filter(s => s.owner_id === user.id).length}
                    </div>
                    <div className="text-sm text-gray-500">Owned Servers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
