import {
  Component,
  OnDestroy,
  OnInit,
  signal,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { io } from 'socket.io-client';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
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
  IonLabel,
  IonModal,
  IonList,
  IonText,
  IonBadge,
  IonSpinner,
} from '@ionic/angular/standalone';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imageOutline, locationOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

//Models( Data structure) imports here
import { ChatModel } from '../../models/chat.model';
import { ChatHistory } from '../../models/chatHistory.model';

//import Service
import { AuthService } from '../../services/auth.service';

// 位置选择器
import {
  LocationPickerComponent,
  type PickedLocation,
} from '../../components/location-picker/location-picker.component';

@Component({
  selector: 'app-chat-detail',
  templateUrl: './chat-detail.page.html',
  styleUrls: ['./chat-detail.page.scss'],
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
    IonButtons,
    IonButton,
    IonAvatar,
    IonIcon,
    IonLabel,
    IonModal,
    IonList,
    IonText,
    IonBadge,
    IonSpinner,
  ],
})
export class ChatDetailPage implements OnInit, OnDestroy {
  @ViewChild('chatContent') chatContent!: IonContent;
  @ViewChild('chatFileInput') chatFileInput!: ElementRef<HTMLInputElement>;
  socket: any;

  // 暴露给模板使用
  env = environment;
  //signal NEW in angular rather than RxJS
  messages = signal<ChatModel[]>([]);

  //injects (import)
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  //get user info from chat list page(Tab3)
  roomInfoTab3: any;
  myself: any; //from socket io
  roomId: string = '';
  getUserFromService: any;
  serverOffset = 0;
  showChat: boolean = true;
  readonly defaultAvatar = 'assets/icon/user.svg';
  myAvatar = this.defaultAvatar;
  otherAvatar = this.defaultAvatar;

  //input checking before it send to node
  messageInput = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  // 图片上传状态
  uploadingImage = signal(false);

  // 订单房间相关
  isOrderRoom = false;
  showOrderInfo = false;
  orderInfo: any = null;
  isOrderPreviewOpen = false;

  // 事件房间相关（非订单的普通聊天）
  isEventRoom = false;
  eventInfo: any = null;
  showEventInfo = false;
  readonly orderStatusMap: Record<number, string> = {
    0: '待确认',
    1: '进行中',
    2: '待评价',
    3: '已完成',
    4: '已取消',
  };

  readonly orderColorMap: Record<number, string> = {
    0: 'warning',
    1: 'primary',
    2: 'tertiary',
    3: 'success',
    4: 'danger',
  };

  constructor() {
    addIcons({ imageOutline, locationOutline });
  }

  ngOnInit() {
    //get user from Node server first
    this.getUserFromService = this.auth.currentUser;
    console.log(this.getUserFromService);

    //init room id from chat list page ,and use it to load all msg from this room
    const state = history.state;
    if (state?.targetUser) {
      this.roomInfoTab3 = state.targetUser;
      this.roomId = this.roomInfoTab3.roomId;
      this.otherAvatar = this.toAvatarUrl(this.roomInfoTab3.avatar);
    }
    //add else if ( for event detail page create a chat room 3-16)
    else if (state?.roomId) {
      this.roomId = state.roomId;
    }

    //如果获取到是system类的房间，不显示底部的聊天栏
    if (state?.targetUser?.type === 'system') {
      this.showChat = false;
    }

    // 检测是否为订单房间
    if (state?.targetUser?.orderId || state?.orderId) {
      this.isOrderRoom = true;
      this.loadOrderInfo(this.roomId);
    }
    // 检测是否为事件聊天房间（有 eventId 但没有 orderId）
    else if (state?.targetUser?.eventId || state?.eventId) {
      this.isEventRoom = true;
      this.loadEventInfo(state?.targetUser?.eventId || state?.eventId);
    }

    this.loadMyAvatar();
    this.loadHistory(this.roomId);

    // Init Connection
    this.socket = io(environment.apiBase, {
      auth: {
        token: this.auth.token,
        serverOffset: this.serverOffset,
      },
    });

    //get myself from socket io chat handler
    this.socket.on('myself', (user: any) => {
      this.myself = user;
      console.log(this.myself.id);
      console.log(this.myself.name);
    });

    //send JOIN room request to server
    this.socket.on('connect', () => {
      if (this.roomId) {
        this.socket.emit('joinRoom', this.roomId);
        console.log('Joined room', this.roomId);
      }
    });

    // step 2: receive msg from node and show it
    this.socket.on('chat message', (msg: any, offset?: number) => {
      // 构造完整消息对象，兼容新旧格式
      const fullMsg: ChatModel = {
        messageType: msg.messageType || 'text',
        text: msg.text || '',
        imageUrl: msg.imageUrl || '',
        location: msg.location || null,
        senderId: msg.senderId,
        userName: msg.userName,
        sendTime: msg.sendTime,
        avatar: msg.avatar,
      };
      this.addMessage(fullMsg);

      if (offset) {
        this.serverOffset = offset;
        this.socket.auth.serverOffset = offset;
      }

      // 收到新消息后自动滚动到底部
      setTimeout(() => {
        this.chatContent?.scrollToBottom(300);
      }, 50);
    });

    //tell user the connnection with this room chat finally success!!~~
    this.socket.on('connectSuccess', async (msg: ChatModel) => {
      const toast = await this.toastCtrl.create({
        message: msg.text,
        duration: 500,
        position: 'top',
        color: 'light',
      });
      await toast.present();
    });
  }

  //load msg history by API using ROOM_ID from chat list page !
  loadHistory(roomId: string) {
    this.http
      .get<ChatHistory>(
        `${environment.apiBase}/api/messages/history?roomId=${roomId}&pageSize=100&sortOrder=desc`,
      )
      .subscribe({
        next: (res) => {
          if (!res.success) return;
          console.log(res);
          // 倒序获取最新消息后，反转为正序（从旧到新）用于显示
          const apiMsg: ChatModel[] = res.data.messages
            .reverse()
            .map((msg: any) => ({
              messageType: msg.messageType || 'text',
              text: msg.text || '',
              imageUrl: msg.imageUrl || '',
              location: msg.location || null,
              senderId: msg.senderId,
              userName: msg.userName,
              sendTime: msg.sendTime,
              avatar: msg.avatar,
            }));

          this.messages.set(apiMsg);

          // 加载完成后自动滚动到底部
          setTimeout(() => {
            this.chatContent?.scrollToBottom(0);
          }, 100);
        },
        error: (err) => {
          console.error('加载历史消息失败', err);
        },
      });
  }

  // step 1: send the message user input in client
  sendMessage() {
    const checkMsg = this.messageInput.value;

    //check if the input not null and not only space
    if (checkMsg && checkMsg.trim()) {
      // only send text; server will attach sender identity
      this.socket.emit('chat message', {
        messageType: 'text',
        text: checkMsg,
      });
      this.messageInput.reset();
    }
  }

  // ================= 照片发送 =================

  triggerFileInput() {
    this.chatFileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    input.value = ''; // 重置input，允许重复选同一文件

    // 校验文件类型和大小
    if (!file.type.startsWith('image/')) {
      this.showToast('请选择图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('图片不能超过10MB');
      return;
    }

    this.uploadingImage.set(true);

    try {
      // 上传图片到服务器
      const formData = new FormData();
      formData.append('images', file);

      const res = await fetch(`${environment.apiBase}/upload/images`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || '上传失败');
      }

      const data = await res.json();
      if (!data.success || !data.paths?.length) {
        throw new Error('上传返回数据异常');
      }

      const imageUrl = data.paths[0];

      // 发送图片消息（不传 text，让服务端用默认值）
      this.socket.emit('chat message', {
        messageType: 'image',
        imageUrl: imageUrl,
      });
    } catch (err: any) {
      this.showToast(err.message || '图片上传失败，请重试');
      console.error('图片上传失败:', err);
    } finally {
      this.uploadingImage.set(false);
    }
  }

  // ================= 定位发送 =================

  async sendLocation() {
    const modal = await this.modalCtrl.create({
      component: LocationPickerComponent,
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();

    if (role !== 'confirm' || !data?.selected) return;

    const picked: PickedLocation = data.selected;

    // 发送定位消息
    this.socket.emit('chat message', {
      messageType: 'location',
      text: picked.text + (picked.address !== picked.text ? ' · ' + picked.address : ''),
      location: {
        lng: picked.lng,
        lat: picked.lat,
        address: picked.address,
      },
    });
  }

  private async showToast(message: string) {
    const t = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
    });
    await t.present();
  }

  //在messages这个数据结构中，继续顺序添加新的msg
  private addMessage(msg: ChatModel) {
    this.messages.update((prev) => [...prev, msg]);
  }

  private loadMyAvatar() {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    this.http
      .get<any>(`${environment.apiBase}/users/${userId}/profile`)
      .subscribe({
        next: (res) => {
          const avatarPath =
            res?.user?.UserAvatar || res?.user?.userAvatar || '';
          this.myAvatar = this.toAvatarUrl(avatarPath);
        },
        error: () => {
          this.myAvatar = this.defaultAvatar;
        },
      });
  }

  isMyMessage(msg: ChatModel): boolean {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    return String(msg.senderId) === userId;
  }

  getMessageAvatar(msg: ChatModel): string {
    if (this.isMyMessage(msg)) {
      return this.myAvatar;
    }
    return this.toAvatarUrl(msg.avatar || this.otherAvatar);
  }

  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.src = this.defaultAvatar;
    }
  }

  private getCurrentUserId(): string {
    const userId =
      this.myself?.id ??
      this.getUserFromService?.UserId ??
      this.getUserFromService?.id;
    return userId ? String(userId) : '';
  }

  private toAvatarUrl(path?: string): string {
    if (!path || !path.trim()) return this.defaultAvatar;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('assets/')) return path;
    if (path.startsWith('/assets/')) return path;
    return `${environment.apiBase}${path.startsWith('/') ? path : `/${path}`}`;
  }

  get orderStatusText(): string {
    if (!this.orderInfo) return '';
    return this.orderStatusMap[this.orderInfo.OrderStatus] || '未知状态';
  }

  get orderStatusColor(): string {
    if (!this.orderInfo) return 'medium';
    return this.orderColorMap[this.orderInfo.OrderStatus] || 'medium';
  }

  loadOrderInfo(roomId: string) {
    this.http
      .get<any>(`${environment.apiBase}/api/rooms/${roomId}/order-info`)
      .subscribe({
        next: (res) => {
          if (res.success && res.data?.order) {
            this.orderInfo = res.data.order;
          }
        },
        error: (err) => {
          console.error('加载订单信息失败', err);
        },
      });
  }

  loadEventInfo(eventId: number) {
    this.http
      .get<any>(`${environment.apiBase}/events/${eventId}`)
      .subscribe({
        next: (res) => {
          if (res?.event) {
            this.eventInfo = res.event;
          }
        },
        error: (err) => {
          console.error('加载事件信息失败', err);
        },
      });
  }

  goToEventDetail() {
    if (this.orderInfo?.EventId) {
      this.router.navigate(['/particular'], {
        queryParams: { eventId: this.orderInfo.EventId },
      });
    }
  }

  openOrderPreview() {
    this.isOrderPreviewOpen = true;
  }

  closeOrderPreview() {
    this.isOrderPreviewOpen = false;
  }

  goToEventDetailFromChat() {
    const eventId = this.orderInfo?.EventId || this.eventInfo?.EventId;
    if (eventId) {
      this.router.navigate(['/particular'], {
        queryParams: { eventId },
      });
    }
  }

  getEventTypeLabel(type: number): string {
    return type === 1 ? '帮助' : '求助';
  }

  // ================= 图片预览和定位查看 =================

  previewImage(url: string) {
    window.open(url, '_blank');
  }

  openMapLocation(location: { lng: number; lat: number; address: string }) {
    // 高德地图 URI 打开定位
    window.open(
      `https://uri.amap.com/marker?position=${location.lng},${location.lat}&name=${encodeURIComponent(location.address)}`,
      '_blank'
    );
  }

  get orderStatusMapForPreview(): Record<number, string> {
    return this.orderStatusMap;
  }

  get orderColorMapForPreview(): Record<number, string> {
    return this.orderColorMap;
  }

  ngOnDestroy() {
    // 离开页面时断开连接，防止内存泄漏
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
