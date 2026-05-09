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
import { addIcons } from 'ionicons';
import {
  documentText,
  chevronUp,
  chevronDown,
  handLeft,
  heart,
} from 'ionicons/icons';
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
  IonBadge,
  IonSpinner,
} from '@ionic/angular/standalone';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastController, AlertController } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { imageOutline, locationOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

//Models( Data structure) imports here
import { ChatModel } from '../../models/chat.model';
import { ChatHistory } from '../../models/chatHistory.model';

//import Service
import { AuthService } from '../../services/auth.service';
import {
  ReviewModalComponent,
  ReviewSubmitPayload,
} from '../../components/review-modal/review-modal.component';
import { ReviewDetailModalComponent } from '../../components/review-detail-modal/review-detail-modal.component';

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
    IonButton,
    IonAvatar,
    IonIcon,
    IonLabel,
    IonModal,
    IonBadge,
    ReviewModalComponent,
    ReviewDetailModalComponent,
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
  private router = inject(Router);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
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
    addIcons({
      documentText,
      chevronUp,
      chevronDown,
      handLeft,
      heart,
    });
    //get user from Node server first
    this.getUserFromService = this.auth.currentUser;

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
      // 从roomId解析对方用户ID，主动获取头像和昵称
      this.loadOtherUserInfo(state.roomId);
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
    // 同时检查房间是否已关联订单
    else if (state?.targetUser?.eventId || state?.eventId) {
      const eventId = state?.targetUser?.eventId || state?.eventId;
      // 先尝试加载订单信息（房间可能已关联订单）
      this.loadOrderInfo(this.roomId);
      // 同时加载事件信息作为备选
      this.loadEventInfo(eventId);
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
    });

    //send JOIN room request to server
    this.socket.on('connect', () => {
      if (this.roomId) {
        this.socket.emit('joinRoom', this.roomId);
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
        targetUserId: msg.targetUserId,
      };
      // 过滤：只显示发给自己的或所有人的消息
      if (!this.isMessageVisible(fullMsg)) return;
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

    // 监听订单状态更新
    this.socket.on('orderStatusUpdate', (data: any) => {
      if (data && this.orderInfo && data.orderId === this.orderInfo.OrderId) {
        this.orderInfo.OrderStatus = data.newStatus;
        this.showToast(data.message || '订单状态已更新');
      }
    });

    // 监听新订单创建（对方下单后刷新订单信息）
    this.socket.on('orderCreated', (data: any) => {
      if (data && data.roomId === this.roomId) {
        this.loadOrderInfo(this.roomId);
      }
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
              targetUserId: msg.targetUserId,
            }))
            .filter((msg) => this.isMessageVisible(msg));

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

  /** 从事件详情页进入时，根据roomId解析对方用户ID并获取头像 */
  private loadOtherUserInfo(roomId: string) {
    const myId = this.getCurrentUserId();
    if (!myId || !roomId) return;

    // roomId格式：eventId_creatorId_partnerId
    const parts = roomId.split('_');
    if (parts.length < 3) return;

    const creatorId = Number(parts[1]);
    const partnerId = Number(parts[2]);
    const otherUserId = Number(myId) === creatorId ? partnerId : creatorId;
    if (!otherUserId) return;

    this.http
      .get<any>(`${environment.apiBase}/users/${otherUserId}/profile`)
      .subscribe({
        next: (res) => {
          const user = res?.user;
          if (user) {
            this.otherAvatar = this.toAvatarUrl(
              user.UserAvatar || user.userAvatar,
            );
            // 同时设置对方昵称用于消息显示
            if (!this.roomInfoTab3) {
              this.roomInfoTab3 = { name: user.UserName || '' };
            }
          }
        },
        error: (err) => {
          console.error('获取对方用户信息失败', err);
        },
      });
  }

  isMyMessage(msg: ChatModel): boolean {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    return String(msg.senderId) === userId;
  }

  /** 消息是否对当前用户可见（targetUserId 为空或等于当前用户） */
  isMessageVisible(msg: ChatModel): boolean {
    if (msg.targetUserId == null) return true;
    const userId = this.getCurrentUserId();
    return userId !== '' && Number(userId) === msg.targetUserId;
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
    const status = this.orderInfo.OrderStatus;
    if (status === 2) {
      if (this.hasReviewed && this.otherHasReviewed) return '双方已评价';
      if (this.hasReviewed) return '我方已评价，等待对方';
      if (this.otherHasReviewed) return '对方已评价，待我方评价';
      return '待评价';
    }
    return this.orderStatusMap[status] || '未知状态';
  }

  get orderStatusColor(): string {
    if (!this.orderInfo) return 'medium';
    return this.orderColorMap[this.orderInfo.OrderStatus] || 'medium';
  }

  loadOrderInfo(roomId: string) {
    const userId = this.auth.currentUserId || 0;
    this.http
      .get<any>(`${environment.apiBase}/api/rooms/${roomId}/order-info`, {
        params: { userId: String(userId) },
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data?.order) {
            this.orderInfo = res.data.order;
            this.isOrderRoom = true;
            // 如果订单关联了事件，同时加载事件信息
            if (res.data.eventId) {
              this.loadEventInfo(res.data.eventId);
            }
          }
        },
        error: (err) => {
          // 非订单房间，保持isEventRoom状态
        },
      });
  }

  loadEventInfo(eventId: number) {
    this.http.get<any>(`${environment.apiBase}/events/${eventId}`).subscribe({
      next: (res) => {
        if (res?.event) {
          this.eventInfo = res.event;
          // 仅非订单房间才显示事件信息栏，避免与订单信息栏重复
          if (!this.isOrderRoom) {
            this.isEventRoom = true;
          }
        }
      },
      error: (err) => {
        console.error('加载事件信息失败', err);
      },
    });
  }

  goToEventDetail() {
    const eventId = this.orderInfo?.EventId || this.eventInfo?.EventId;
    if (eventId) {
      this.isOrderPreviewOpen = false;
      (document.activeElement as HTMLElement)?.blur();
      setTimeout(() => {
        this.router.navigate(['/particular'], {
          queryParams: { eventId },
        });
      }, 100);
    }
  }

  openOrderPreview() {
    this.isOrderPreviewOpen = true;
  }

  closeOrderPreview() {
    this.isOrderPreviewOpen = false;
  }

  getEventTypeLabel(type: number): string {
    return type === 1 ? '帮助' : '求助';
  }

  /** 判断当前用户是否是买家 */
  get isCurrentUserBuyer(): boolean {
    const userId = this.auth.currentUserId;
    return userId != null && this.orderInfo?.ConsumerId === userId;
  }

  // ================= 图片预览和定位查看 =================

  previewImage(url: string) {
    window.open(url, '_blank');
  }

  openMapLocation(location: { lng: number; lat: number; address: string }) {
    // 高德地图 URI 打开定位
    window.open(
      `https://uri.amap.com/marker?position=${location.lng},${location.lat}&name=${encodeURIComponent(location.address)}`,
      '_blank',
    );
  }

  get orderStatusMapForPreview(): Record<number, string> {
    return this.orderStatusMap;
  }

  /** 判断当前用户是否是卖家 */
  get isCurrentUserSeller(): boolean {
    const userId = this.auth.currentUserId;
    return userId != null && this.orderInfo?.ProviderId === userId;
  }

  async confirmOrder() {
    if (!this.orderInfo?.OrderId) return;
    try {
      const res = await fetch(
        `${environment.apiBase}/orders/${this.orderInfo.OrderId}/confirm`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...this.auth.getAuthHeader(),
          },
        },
      );
      const data = await res.json();
      if (data.success) {
        this.orderInfo.OrderStatus = 1;
        this.showToast('订单已确认');
      } else {
        this.showToast(data.error || '确认失败');
      }
    } catch {
      this.showToast('网络错误');
    }
  }

  async cancelOrder() {
    if (!this.orderInfo?.OrderId) return;
    const alert = await this.alertCtrl.create({
      header: '确认取消订单',
      message: '取消后将无法恢复，确定要取消这个订单吗？',
      cssClass: 'cancel-order-alert',
      buttons: [
        {
          text: '再想想',
          role: 'cancel',
        },
        {
          text: '确认取消',
          role: 'destructive',
          handler: async () => {
            try {
              const res = await fetch(
                `${environment.apiBase}/orders/${this.orderInfo.OrderId}/cancel`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    ...this.auth.getAuthHeader(),
                  },
                },
              );
              const data = await res.json();
              if (data.success) {
                this.orderInfo.OrderStatus = 4;
                this.showToast('订单已取消');
              } else {
                this.showToast(data.error || '取消失败');
              }
            } catch {
              this.showToast('网络错误');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async completeOrder() {
    if (!this.orderInfo?.OrderId) return;
    try {
      const res = await fetch(
        `${environment.apiBase}/orders/${this.orderInfo.OrderId}/complete`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...this.auth.getAuthHeader(),
          },
        },
      );
      const data = await res.json();
      if (data.success) {
        this.orderInfo.OrderStatus = 2;
        this.showToast('订单已完成，请评价');
      } else {
        this.showToast(data.error || '操作失败');
      }
    } catch {
      this.showToast('网络错误');
    }
  }

  // ---- 评价功能 ----
  isReviewModalOpen = false;
  isSubmittingReview = false;

  openReviewModal() {
    this.closeOrderPreview();
    if (this.hasReviewed) {
      this.showToast('你已经评价过该订单');
      return;
    }
    this.isReviewModalOpen = true;
  }

  closeReviewModal() {
    this.isReviewModalOpen = false;
  }

  get hasReviewed(): boolean {
    return Number(this.orderInfo?.HasReviewed || 0) > 0;
  }

  get otherHasReviewed(): boolean {
    return Number(this.orderInfo?.OtherHasReviewed || 0) > 0;
  }

  async handleReviewSubmit(payload: ReviewSubmitPayload) {
    if (!this.orderInfo?.OrderId) return;
    const userId = this.auth.currentUserId;
    if (!userId) return;

    const targetUserId =
      this.orderInfo.ConsumerId === userId
        ? this.orderInfo.ProviderId
        : this.orderInfo.ConsumerId;

    this.isSubmittingReview = true;
    try {
      const resp = await fetch(`${environment.apiBase}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.auth.getAuthHeader(),
        },
        body: JSON.stringify({
          OrderId: this.orderInfo.OrderId,
          TargetUserId: targetUserId,
          Score: payload.Score,
          Text: payload.Text,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success) {
        this.showToast(data?.error || '提交失败');
        return;
      }
      this.closeReviewModal();
      this.refreshOrderInfo();
      this.showToast('评价已提交');
    } catch {
      this.showToast('网络错误');
    } finally {
      this.isSubmittingReview = false;
    }
  }

  // ---- 查看评价详情 ----
  isReviewDetailOpen = false;

  openReviewDetail() {
    this.isReviewDetailOpen = true;
  }

  closeReviewDetail() {
    this.isReviewDetailOpen = false;
  }

  /** 刷新订单状态 */
  refreshOrderInfo() {
    if (!this.orderInfo?.OrderId) return;
    this.http
      .get<any>(`${environment.apiBase}/orders/${this.orderInfo.OrderId}`, {
        headers: this.auth.getAuthHeader() as any,
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data?.order) {
            this.orderInfo = res.data.order;
          }
        },
      });
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
