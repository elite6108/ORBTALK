export interface Server {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  invite_code: string;
  owner_id: string;
  is_verified: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: 'text' | 'voice';
  description: string | null;
  position: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  message_count: number;
}

export interface CreateServerData {
  name: string;
  description?: string;
  icon_url?: string;
}

export interface CreateChannelData {
  server_id: string;
  name: string;
  type: 'text' | 'voice';
  description?: string;
  is_private?: boolean;
}

export interface JoinServerData {
  invite_code: string;
}

export interface ServerMember {
  id: string;
  server_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joined_at: string;
  user?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}
