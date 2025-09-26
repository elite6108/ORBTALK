export interface DmThread {
  id: string;
  is_group: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DmParticipant {
  id: string;
  thread_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface DmMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  content_type: 'text' | 'image' | 'file' | 'embed';
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}


