//12-24 this is a easy interface for the user + msg
export interface ChatModel {
  text: string;
  senderId: string;
  userName: string;
  sendTime: string | Date;
}
