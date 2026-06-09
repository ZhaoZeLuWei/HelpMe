export interface SupportRoom {
  roomId: string;
  userId: number;
  userName: string;
  userAvatar: string;
  lastMsg: string;
  unreadCount: Record<string, number>;
  updatedAt: string | Date;
}

export interface SupportMessage {
  id?: string;
  roomId: string;
  senderId: number;
  messageType: 'text' | 'image' | 'location';
  text: string;
  imageUrl: string;
  location?: { lng: number; lat: number; address: string } | null;
  sendTime: string | Date;
  userName: string;
}
