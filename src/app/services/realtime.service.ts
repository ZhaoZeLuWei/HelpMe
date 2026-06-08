import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export type RealtimeConnectOptions = {
  token: string | null;
  serverOffset?: number;
};

/** 统一 Socket.IO 连接配置，避免各页重复 io(apiBase, …) */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  connect(options: RealtimeConnectOptions): Socket {
    const auth: Record<string, unknown> = { token: options.token };
    if (options.serverOffset != null) {
      auth['serverOffset'] = options.serverOffset;
    }
    return io(environment.apiBase, { auth });
  }
}
