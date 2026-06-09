import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root',
})
export class SupportSocketService {
  private socket: Socket | null = null;

  constructor(private auth: AuthService) {}

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = this.auth.getToken();
    this.socket = io(`${environment.apiBase}/support`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect_error', (err) => {
      console.error('客服 Socket 连接失败:', err.message);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}
