export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  is_edited: boolean;
  edited_at: string | null;
  parent_message_id: string | null;
  reactions: Record<string, string[]>; // emoji -> user_ids
  attachments: MessageAttachment[];
  user?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  created_at: string;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: 'text' | 'voice' | 'category';
  description: string | null;
  position: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  max_participants: number;
  is_locked: boolean;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
}

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

export interface SendMessageData {
  channel_id: string;
  content: string;
  parent_message_id?: string;
}

export interface MessageReaction {
  emoji: string;
  user_id: string;
  message_id: string;
}

export interface TypingUser {
  user_id: string;
  channel_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  started_at: string;
}
