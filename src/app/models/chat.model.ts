//12-24 this is a easy interface for the user + msg
export interface ChatModel {
  text: string;
  senderId: string | number;
  userName: string;
  sendTime: string | Date;
  avatar?: string;
}
