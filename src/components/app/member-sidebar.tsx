'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Crown, Shield, ShieldCheck } from 'lucide-react';

interface ServerMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string;
  };
}

interface MemberSidebarProps {
  serverId: string;
  initialMembers?: ServerMember[];
}

export function MemberSidebar({ serverId, initialMembers }: MemberSidebarProps) {
  const [members, setMembers] = useState<ServerMember[]>(initialMembers || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/servers/${serverId}/members`);
        if (!res.ok) {
          setMembers([]);
          return;
        }
        const data = await res.json();
        setMembers(data.members || []);
      } catch (error) {
        console.error('Error loading members:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [serverId]);

  // Group members by role
  const owners = members.filter(m => m.role === 'owner');
  const admins = members.filter(m => m.role === 'admin');
  const moderators = members.filter(m => m.role === 'moderator');
  const regularMembers = members.filter(m => m.role === 'member');

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-yellow-400" />;
      case 'admin':
        return <ShieldCheck className="h-3 w-3 text-red-400" />;
      case 'moderator':
        return <Shield className="h-3 w-3 text-blue-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const renderMemberGroup = (title: string, memberList: ServerMember[]) => {
    if (memberList.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="px-2 py-1 text-xs font-semibold text-[#949ba4] uppercase tracking-wide">
          {title} — {memberList.length}
        </div>
        <div className="space-y-1">
          {memberList.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#404249] cursor-pointer group"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.user.avatar_url || ''} alt={member.user.display_name || member.user.username} />
                  <AvatarFallback className="bg-[#5865f2] text-white text-xs">
                    {(member.user.display_name || member.user.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#2b2d31] ${getStatusColor(member.user.status)}`} />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="text-sm text-[#dbdee1] truncate group-hover:text-white">
                  {member.user.display_name || member.user.username}
                </span>
                {getRoleIcon(member.role)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col border-l border-black/20">
      {/* Header */}
      <div className="h-12 border-b border-black/30 flex items-center px-4 shadow-md">
        <div className="flex items-center gap-2 text-[#f2f3f5] font-semibold">
          <Users className="h-5 w-5" />
          <span>Members</span>
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {loading ? (
          <div className="text-center text-[#949ba4] py-4">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="text-center text-[#949ba4] py-4">No members found</div>
        ) : (
          <>
            {renderMemberGroup('Owner', owners)}
            {renderMemberGroup('Admins', admins)}
            {renderMemberGroup('Moderators', moderators)}
            {renderMemberGroup('Members', regularMembers)}
          </>
        )}
      </div>
    </div>
  );
}
