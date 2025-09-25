'use client';

import { useAuth } from '@/lib/auth/context';
import { UserMenu } from '@/components/auth/user-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Mic, Shield } from 'lucide-react';
import Link from 'next/link';

interface HomePageProps {
  user: any;
}

export function HomePage({ user }: HomePageProps) {
  const { profile } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-6">
              Welcome to <span className="text-indigo-600">Orbit</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              A modern Discord-style chat application with real-time messaging, voice channels, and seamless collaboration.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/sign-up">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </div>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <MessageSquare className="h-8 w-8 text-indigo-600 mb-2" />
                <CardTitle>Real-time Chat</CardTitle>
                <CardDescription>
                  Send messages instantly with real-time synchronization across all devices.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Mic className="h-8 w-8 text-indigo-600 mb-2" />
                <CardTitle>Voice Channels</CardTitle>
                <CardDescription>
                  Join voice channels for crystal-clear audio communication with your team.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-indigo-600 mb-2" />
                <CardTitle>Server Management</CardTitle>
                <CardDescription>
                  Create and manage servers with customizable channels and permissions.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-indigo-600">Orbit</h1>
            <nav className="hidden md:flex space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/servers" className="text-gray-600 hover:text-gray-900">
                Servers
              </Link>
              {profile?.is_admin && (
                <Link href="/admin" className="text-gray-600 hover:text-gray-900 flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {profile?.display_name || profile?.username}!
          </h2>
          <p className="text-gray-600">
            Ready to connect with your community?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-indigo-600" />
                Recent Messages
              </CardTitle>
              <CardDescription>
                Continue your conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                No recent messages yet. Join a server to start chatting!
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-indigo-600" />
                Your Servers
              </CardTitle>
              <CardDescription>
                Manage your communities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                You haven't joined any servers yet.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="h-5 w-5 mr-2 text-indigo-600" />
                Voice Channels
              </CardTitle>
              <CardDescription>
                Join voice conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                No active voice channels available.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/servers">Explore Servers</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
