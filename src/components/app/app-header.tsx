'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Bell, HelpCircle } from 'lucide-react';

interface AppHeaderProps {
  user: any;
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shadow-sm">
      {/* Channel Info */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <span className="text-gray-500">#</span>
          <span className="font-semibold text-gray-900">general</span>
        </div>
        <div className="text-sm text-gray-500">
          Welcome to the general channel
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Side Actions */}
      <div className="flex items-center space-x-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search"
            className="pl-10 w-64 bg-gray-100 border-gray-200 focus:bg-white"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Help */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
