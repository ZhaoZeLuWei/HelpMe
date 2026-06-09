import {
  Component,
  OnDestroy,
  OnInit,
  signal,
  inject,
  ViewChild,
  ElementRef,
  NgZone,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonItem,
  IonFooter,
  IonInput,
  IonButton,
  IonAvatar,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import {
  imageOutline,
  locationOutline,
  chatbubbleEllipsesOutline,
} from 'ionicons/icons';
import { environment } from '../../../environments/environment';
import { ChatModel } from '../../models/chat.model';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { DynamicTranslationService } from '../../services/dynamic-translation.service';
import { UploadService } from '../../services/upload.service';
import { LocationPickerService } from '../../services/location-picker.service';
import { RealtimeService } from '../../services/realtime.service';
import { TranslateTextPipe } from '../../pipes/translate-text.pipe';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-support-chat',
  templateUrl: './support-chat.page.html',
  styleUrls: ['./support-chat.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonItem,
    IonFooter,
    IonInput,
    IonButton,
    IonAvatar,
    IonIcon,
    IonSpinner,
    TranslateTextPipe,
  ],
})
export class SupportChatPage implements OnInit, OnDestroy {
  @ViewChild('chatContent') chatContent!: IonContent;
  @ViewChild('chatFileInput') chatFileInput!: ElementRef<HTMLInputElement>;

  private socket: Socket | null = null;
  private router = inject(Router);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private zone = inject(NgZone);
  private uploadService = inject(UploadService);
  private locationPicker = inject(LocationPickerService);
  private langService = inject(LanguageService);
  private dynTrans = inject(DynamicTranslationService);

  env = environment;
  messages = signal<ChatModel[]>([]);
  roomId = '';
  myself: any;
  uploadingImage = signal(false);
  loading = signal(false);
  readonly defaultAvatar = 'assets/icon/user.svg';
  myAvatar = this.defaultAvatar;

  // 翻译对象
  t = this.langService.getTranslations('zh').supportChat;

  messageInput = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  constructor() {
    addIcons({ imageOutline, locationOutline, chatbubbleEllipsesOutline });
  }

  ngOnInit() {
    this.loading.set(true);

    // 监听语言变化
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).supportChat;
    });

    // 创建或获取客服房间
    const token = this.auth.token;
    if (!token) {
      this.router.navigate(['/tabs/tab4']);
      return;
    }

    this.http
      .post<any>(
        `${environment.apiBase}/api/support/room`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.roomId = res.data.roomId;
            this.connectSocket();
            this.loadHistory();
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.showToast(this.t.connectFailed);
        },
      });
  }

  ngOnDestroy() {
    this.socket?.disconnect();
  }

  private connectSocket() {
    const token = this.auth.token;
    this.socket = io(`${environment.apiBase}/support`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('myself', (user: any) => {
      this.myself = user;
      this.loadMyAvatar();
    });

    this.socket.on('connect', () => {
      if (this.roomId) {
        this.socket?.emit('support:join', this.roomId);
      }
    });

    this.socket.on('support:message', (msg: any) => {
      this.zone.run(() => {
        const fullMsg: ChatModel = {
          messageType: msg.messageType || 'text',
          text: msg.text || '',
          imageUrl: msg.imageUrl || '',
          location: msg.location || null,
          senderId: msg.senderId,
          userName: msg.userName,
          sendTime: msg.sendTime,
        };
        this.addMessage(fullMsg);
        setTimeout(() => this.chatContent?.scrollToBottom(300), 50);
      });
    });

    this.socket.on('support:connected', async (msg: any) => {
      const toast = await this.toastCtrl.create({
        message: msg.text,
        duration: 1500,
        position: 'top',
        color: 'light',
      });
      await toast.present();
    });

    this.socket.on('support:error', (data: any) => {
      this.showToast(data.message || '操作失败');
    });

    this.socket.on('support:moderationFailed', (data: any) => {
      this.showToast(data.message || '内容审核未通过');
    });
  }

  private loadHistory() {
    const token = this.auth.token;
    this.http
      .get<any>(`${environment.apiBase}/api/support/messages`, {
        params: { roomId: this.roomId, pageSize: '100', sortOrder: 'asc' },
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            const history: ChatModel[] = res.data.messages.map((msg: any) => ({
              messageType: msg.messageType || 'text',
              text: msg.text || '',
              imageUrl: msg.imageUrl || '',
              location: msg.location || null,
              senderId: msg.senderId,
              userName: msg.userName,
              sendTime: msg.sendTime,
            }));
            this.messages.set(history);
            setTimeout(() => this.chatContent?.scrollToBottom(300), 100);
          }
        },
      });
  }

  sendMessage() {
    const text = this.messageInput.value.trim();
    if (!text || !this.socket) return;

    this.socket.emit('support:message', {
      messageType: 'text',
      text,
    });
    this.messageInput.reset();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    input.value = '';

    if (!file.type.startsWith('image/')) {
      this.showToast(this.t.selectImage);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.showToast(this.t.imageTooLarge);
      return;
    }

    this.uploadingImage.set(true);
    try {
      const paths = await this.uploadService.uploadImages(file);
      const imageUrl = paths[0];
      if (!imageUrl) throw new Error(this.t.uploadFailed);

      this.socket?.emit('support:message', {
        messageType: 'image',
        imageUrl,
      });
    } catch (err: any) {
      this.showToast(err.message || this.t.uploadError);
    } finally {
      this.uploadingImage.set(false);
    }
  }

  async sendLocation() {
    const picked = await this.locationPicker.pickLocation();
    if (!picked) return;

    this.socket?.emit('support:message', {
      messageType: 'location',
      text:
        picked.text +
        (picked.address !== picked.text ? ' · ' + picked.address : ''),
      location: {
        lng: picked.lng,
        lat: picked.lat,
        address: picked.address,
      },
    });
  }

  triggerFileInput() {
    this.chatFileInput?.nativeElement?.click();
  }

  isMyMessage(msg: ChatModel): boolean {
    return Number(msg.senderId) === Number(this.myself?.id);
  }

  getMessageAvatar(msg: ChatModel): string {
    return this.isMyMessage(msg) ? this.myAvatar : this.defaultAvatar;
  }

  previewImage(url: string) {
    window.open(url, '_blank');
  }

  openMapLocation(location: { lng: number; lat: number; address: string }) {
    const url = `https://uri.amap.com/marker?position=${location.lng},${location.lat}&name=${encodeURIComponent(location.address)}`;
    window.open(url, '_blank');
  }

  private loadMyAvatar() {
    const userId = this.myself?.id;
    if (!userId) return;

    this.http
      .get<any>(`${environment.apiBase}/users/${userId}/profile`)
      .subscribe({
        next: (res) => {
          const avatarPath =
            res?.user?.UserAvatar || res?.user?.userAvatar || '';
          this.myAvatar = this.toAvatarUrl(avatarPath);
        },
      });
  }

  private toAvatarUrl(path: string): string {
    if (!path) return this.defaultAvatar;
    if (path.startsWith('http')) return path;
    return `${environment.apiBase}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private addMessage(msg: ChatModel) {
    this.messages.update((prev) => [...prev, msg]);
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}
