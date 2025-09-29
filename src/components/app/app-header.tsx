'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Bell, HelpCircle } from 'lucide-react';

interface AppHeaderProps {
  user: any;
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <div className="h-12 bg-[#313338] border-b border-black/20 flex items-center justify-between px-4 shadow-sm">
      {/* Left side - empty for now, pages will have their own headers */}
      <div className="flex-1" />

      {/* Right Side Actions */}
      <div className="flex items-center space-x-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#949ba4]" />
          <Input
            placeholder="Search"
            className="pl-10 w-64 bg-[#383a40] border-none text-[#dbdee1] placeholder:text-[#87898c] focus:bg-[#383a40]"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#35373c]">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Help */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#35373c]">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
