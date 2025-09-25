'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Settings, Shield } from 'lucide-react';

interface UserMenuProps {
  user: any;
}

export function UserMenu({ user }: UserMenuProps) {
  const profile = user.profile;
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    router.push('/sign-in');
    router.refresh();
  };

  if (!user || !profile) {
    return (
      <div className="flex space-x-2">
        <Button variant="ghost" onClick={() => router.push('/sign-in')}>
          Sign In
        </Button>
        <Button onClick={() => router.push('/sign-up')}>
          Sign Up
        </Button>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name || ''} />
            <AvatarFallback>
              {getInitials(profile.display_name || profile.username)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile.display_name || profile.username}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {profile.is_admin && (
              <p className="text-xs leading-none text-red-600 font-medium">
                Administrator
              </p>
            )}
            {profile.is_moderator && !profile.is_admin && (
              <p className="text-xs leading-none text-blue-600 font-medium">
                Moderator
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        {profile.is_admin && (
          <DropdownMenuItem onClick={() => router.push('/admin')}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Admin Panel</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={loading}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
