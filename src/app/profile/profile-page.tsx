'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { updateProfile } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, Mail, Calendar, MessageSquare } from 'lucide-react';

interface ProfilePageProps {
  user: any;
}

export function ProfilePage({ user }: ProfilePageProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    username: profile?.username || '',
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await updateProfile(formData);

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Profile Info */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name || ''} />
                      <AvatarFallback className="text-2xl">
                        {getInitials(profile.display_name || profile.username)}
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle>{profile.display_name || profile.username}</CardTitle>
                    <CardDescription>@{profile.username}</CardDescription>
                    {profile.is_admin && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-2">
                        Administrator
                      </span>
                    )}
                    {profile.is_moderator && !profile.is_admin && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                        Moderator
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {user.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Joined {new Date(profile.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {profile.message_count} messages
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Edit Profile Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Profile</CardTitle>
                  <CardDescription>
                    Update your profile information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    {success && (
                      <Alert>
                        <AlertDescription>Profile updated successfully!</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        disabled={loading}
                        placeholder="Enter your username"
                      />
                      <p className="text-xs text-gray-500">
                        3-50 characters, letters, numbers, underscores, and hyphens only
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        disabled={loading}
                        placeholder="How others will see you"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        disabled={loading}
                        placeholder="Tell us about yourself"
                      />
                    </div>
                    
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Profile
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
