import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { Socket } from 'socket.io-client';
import { SupportSocketService } from '../../services/support-socket.service';
import { AuthService } from '../../auth.service';
import { environment } from '../../../environments/environment';
import { SupportRoom, SupportMessage } from '../../models/support.model';

@Component({
  selector: 'app-support-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './support-chat.component.html',
  styleUrl: './support-chat.component.css',
})
export class SupportChatComponent implements OnInit, OnDestroy {
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLInputElement>;

  private socketService = inject(SupportSocketService);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private socket: Socket | null = null;

  rooms: SupportRoom[] = [];
  filteredRooms: SupportRoom[] = [];
  selectedRoom: SupportRoom | null = null;
  messages: SupportMessage[] = [];
  inputText = '';
  searchQuery = '';
  loading = false;
  baseUrl = environment.apiBase;

  ngOnInit(): void {
    this.loadRooms();
    this.socket = this.socketService.connect();
    this.setupSocketListeners();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('support:message', (msg: SupportMessage) => {
      if (msg.roomId === this.selectedRoom?.roomId) {
        this.messages.push(msg);
        this.scrollToBottom();
      }
    });

    this.socket.on(
      'support:listUpdate',
      (data: { roomId: string; lastMsg: string; updatedAt: string }) => {
        const room = this.rooms.find((r) => r.roomId === data.roomId);
        if (room) {
          room.lastMsg = data.lastMsg;
          room.updatedAt = data.updatedAt;
          // 移到列表顶部
          this.rooms.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
        }
        this.filterRooms();
      },
    );

    this.socket.on(
      'support:newRoom',
      (data: { roomId: string; userId: number; userName: string }) => {
        // 新客服请求，刷新列表
        this.loadRooms();
      },
    );

    this.socket.on('support:connected', () => {
      // 连接成功
    });
  }

  loadRooms(): void {
    this.loading = true;
    const token = this.auth.getToken();
    this.http
      .get<any>(`${this.baseUrl}/api/support/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.rooms = res.data.rooms;
            this.filterRooms();
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  filterRooms(): void {
    if (!this.searchQuery.trim()) {
      this.filteredRooms = this.rooms;
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredRooms = this.rooms.filter(
        (r) =>
          r.userName.toLowerCase().includes(q) ||
          r.lastMsg.toLowerCase().includes(q) ||
          r.roomId.includes(q),
      );
    }
  }

  selectRoom(room: SupportRoom): void {
    this.selectedRoom = room;
    this.messages = [];
    // 清零未读
    room.unreadCount['0'] = 0;
    this.loadMessages(room.roomId);
    // 加入 Socket 房间
    this.socket?.emit('support:join', room.roomId);
  }

  loadMessages(roomId: string): void {
    const token = this.auth.getToken();
    this.http
      .get<any>(`${this.baseUrl}/api/support/messages`, {
        params: { roomId, pageSize: '100', sortOrder: 'asc' },
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.messages = res.data.messages;
            setTimeout(() => this.scrollToBottom(), 50);
          }
        },
      });
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || !this.selectedRoom || !this.socket) return;

    this.socket.emit('support:message', {
      messageType: 'text',
      text,
    });

    this.inputText = '';
    this.messageInput?.nativeElement?.focus();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isOwnMessage(msg: SupportMessage): boolean {
    return msg.senderId === 0; // 管理员的 senderId 为 0
  }

  isSystemMessage(msg: SupportMessage): boolean {
    return msg.senderId === -1 || msg.userName === '系统通知';
  }

  getUnreadCount(room: SupportRoom): number {
    return room.unreadCount?.['0'] || 0;
  }

  getAvatarUrl(path: string): string {
    if (!path) return 'assets/icon/user.svg';
    if (path.startsWith('http')) return path;
    const base = path.startsWith('/') ? '' : '/';
    return `${this.baseUrl}${base}${path}?token=${this.auth.getToken()}`;
  }

  formatTime(time: string | Date): string {
    const date = new Date(time);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isToday) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messageContainer?.nativeElement;
      if (el) {
        setTimeout(() => {
          el.scrollTop = el.scrollHeight;
        }, 50);
      }
    } catch {}
  }
}
