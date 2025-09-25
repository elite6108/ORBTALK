'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Users, 
  MessageSquare, 
  Volume2, 
  Hash,
  Crown,
  Settings
} from 'lucide-react';

interface DashboardContentProps {
  user: any;
}

export function DashboardContent({ user }: DashboardContentProps) {
  const recentServers = [
    { id: '1', name: 'General Server', type: 'text', lastMessage: '2 minutes ago', unread: 3 },
    { id: '2', name: 'Gaming Community', type: 'text', lastMessage: '1 hour ago', unread: 1 },
    { id: '3', name: 'Voice Chat', type: 'voice', lastMessage: 'Online', unread: 0 },
  ];

  const recentMessages = [
    { id: '1', user: 'John Doe', message: 'Hey everyone! How is everyone doing?', time: '2 min ago' },
    { id: '2', user: 'Jane Smith', message: 'Great! Just finished working on the new project', time: '5 min ago' },
    { id: '3', user: 'Mike Johnson', message: 'Anyone up for a game later?', time: '10 min ago' },
  ];

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.profile?.display_name || user.profile?.username}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening in your servers today.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Plus className="h-6 w-6 text-indigo-600" />
                </div>
                <Button variant="outline" size="sm">
                  Create
                </Button>
              </div>
              <CardTitle className="text-lg">Create Server</CardTitle>
              <CardDescription>
                Start a new community or bring your friends together
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <Button variant="outline" size="sm">
                  Join
                </Button>
              </div>
              <CardTitle className="text-lg">Join Server</CardTitle>
              <CardDescription>
                Enter an invite code to join an existing community
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
              <CardTitle className="text-lg">Server Settings</CardTitle>
              <CardDescription>
                Customize your servers and manage permissions
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Servers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hash className="h-5 w-5 mr-2" />
                Recent Servers
              </CardTitle>
              <CardDescription>
                Your most active servers and channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentServers.map((server) => (
                  <div
                    key={server.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-200 rounded-lg">
                        {server.type === 'text' ? (
                          <Hash className="h-4 w-4 text-gray-600" />
                        ) : (
                          <Volume2 className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{server.name}</div>
                        <div className="text-sm text-gray-500">{server.lastMessage}</div>
                      </div>
                    </div>
                    {server.unread > 0 && (
                      <div className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {server.unread}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Recent Messages
              </CardTitle>
              <CardDescription>
                Latest conversations across your servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMessages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {message.user.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{message.user}</span>
                        <span className="text-xs text-gray-500">{message.time}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {message.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Server Stats */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="h-5 w-5 mr-2" />
                Your Server Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">3</div>
                  <div className="text-sm text-gray-500">Servers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">12</div>
                  <div className="text-sm text-gray-500">Channels</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">156</div>
                  <div className="text-sm text-gray-500">Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">8</div>
                  <div className="text-sm text-gray-500">Friends</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
