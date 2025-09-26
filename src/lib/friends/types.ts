export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface FriendRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
}

export interface Friendship {
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface UserBasic {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}


