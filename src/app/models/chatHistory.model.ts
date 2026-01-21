import { ChatModel } from './chat.model';

export interface ChatHistory  {
  success: boolean;
  message: string;
  data: {
    messages: ChatModel[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}
