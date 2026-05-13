import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { io } from 'socket.io-client';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  LocationPickerComponent,
  type PickedLocation,
} from '../../components/location-picker/location-picker.component';

import {
  documentText,
  time,
  checkmarkDone,
  star,
  heartOutline,
  handLeft,
  heart,
  eye,
  personCircle,
  logOut,
  imageOutline,
  addCircleOutline,
  closeCircle,
  createOutline,
  cameraOutline,
  locationOutline,
  ribbon,
  briefcase,
  starOutline,
  peopleOutline,
} from 'ionicons/icons';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonButton,
  IonButtons,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonItem,
  IonNote,
  IonModal,
  IonAlert,
  IonList,
  IonInput,
  IonTextarea,
  IonText,
  ModalController,
} from '@ionic/angular/standalone';

import { ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../services/language.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Tab4ProfileCardComponent } from '../../components/tab4-profile-card/tab4-profile-card.component';
import { Tab4EventsPanelComponent } from '../../components/tab4-events-panel/tab4-events-panel.component';
import { Tab4OrdersPanelComponent } from '../../components/tab4-orders-panel/tab4-orders-panel.component';
import {
  ShowEventComponent,
  EventCardData,
} from '../../components/show-event/show-event.component';
import {
  EditEventModalComponent,
  EventEditData,
  EditEventPayload,
} from '../../components/edit-event-modal/edit-event-modal.component';
import {
  ReviewModalComponent,
  ReviewSubmitPayload,
} from '../../components/review-modal/review-modal.component';
import { ReviewDetailModalComponent } from '../../components/review-detail-modal/review-detail-modal.component';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonButtons,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonItem,
    IonNote,
    IonModal,
    IonAlert,
    IonList,
    IonInput,
    IonTextarea,
    IonText,
    ReactiveFormsModule,
    Tab4ProfileCardComponent,
    Tab4EventsPanelComponent,
    Tab4OrdersPanelComponent,
    ShowEventComponent,
    EditEventModalComponent,
    ReviewModalComponent,
    ReviewDetailModalComponent,
  ],
})
export class Tab4Page implements OnDestroy {
  private readonly API_BASE = environment.apiBase;

  private readonly auth = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly modalController = inject(ModalController);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly langService = inject(LanguageService);

  @ViewChild('editEventModal')
  editEventModal!: EditEventModalComponent;

  @ViewChild('profileAvatarInput')
  profileAvatarInput!: ElementRef<HTMLInputElement>;

  isLoggedIn = false;
  private readonly _sub: Subscription;
  private socket: any = null;
  returnEventId: number | null = null;

  // 翻译对象
  t = this.langService.getTranslations('zh').tab4;

  // 用户信息编辑相关
  isEditProfileModalOpen = false;
  isSavingProfile = false;
  profileAvatarPreview: string | null = null;
  profileAvatarFile: File | null = null;
  profileAvatarDeleted = false;
  editProfileForm: FormGroup = this.fb.group({
    UserName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(20)],
    ],
    RealName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(20)],
    ],
    IdCardNumber: [
      '',
      [
        Validators.required,
        Validators.pattern(
          /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/,
        ),
      ],
    ],
    Location: ['', Validators.required],
    LocationPlaceId: [''],
    LocationLng: [null],
    LocationLat: [null],
    BirthDate: ['', Validators.required],
    Introduction: ['', Validators.maxLength(200)],
  });

  // 删除确认弹窗状态
  isDeleteAlertOpen = false;

  // 当前准备删除的 id
  deleteTargetId: number | null = null;

  deletingIds = new Set<number>();

  // 订单详情弹窗
  isOrderDetailModalOpen = false;
  currentOrderDetail: any = null;

  // 编辑弹窗状态
  isEditModalOpen = false;
  editingTaskId: number | null = null;
  editingEventData: EventEditData | null = null;
  isSavingEdit = false;

  async openLocationPicker(formType: 'eventEdit' | 'profileEdit') {
    const form = formType === 'eventEdit' ? null : this.editProfileForm;
    const sharedModal = this.editEventModal;

    const selectedPlaceId =
      formType === 'eventEdit'
        ? sharedModal?.getFormValue('LocationPlaceId') || ''
        : form?.get('LocationPlaceId')?.value || '';
    const selectedText =
      formType === 'eventEdit'
        ? sharedModal?.getFormValue('Location') || ''
        : form?.get('Location')?.value || '';

    const modal = await this.modalController.create({
      component: LocationPickerComponent,
      cssClass: 'location-picker-modal',
      componentProps: {
        selectedPlaceId,
        selectedText,
      },
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role !== 'confirm' || !data?.selected) return;

    const picked: PickedLocation = data.selected;
    const patchValue = {
      Location: picked.text,
      LocationPlaceId: picked.placeId,
      LocationLng: picked.lng,
      LocationLat: picked.lat,
    };

    if (formType === 'eventEdit') {
      sharedModal?.patchForm(patchValue);
    } else {
      form?.patchValue(patchValue);
    }
  }

  // 删除按钮配置
  alertButtons = [
    {
      text: this.t.cancel,
      role: 'cancel',
      handler: () => {
        this.isDeleteAlertOpen = false;
        this.deleteTargetId = null;
      },
    },
    {
      text: this.t.delete,
      role: 'destructive',
      handler: () => {
        if (this.deleteTargetId != null) {
          void this.deleteTask(this.deleteTargetId);
        }
        this.isDeleteAlertOpen = false;
        this.deleteTargetId = null;
      },
    },
  ];

  activeSection: 'events' | 'orders' = 'events';
  orderFilter: 'all' | 'pending' | 'active' | 'review' | 'done' | 'cancelled' =
    'all';

  // 收藏 & 关注弹窗
  isFavoritesModalOpen = false;
  isFollowsModalOpen = false;
  favoritesList: any[] = [];
  followsList: any[] = [];
  isLoadingFavorites = false;
  isLoadingFollows = false;

  userInfo: any = this.createDefaultUserInfo();
  tasks: any[] = [];
  orders: any[] = [];
  orderStats = {
    all: 0,
    pending: 0,
    active: 0,
    review: 0,
    done: 0,
    cancelled: 0,
  };
  isLoadingEvents = false;
  isLoadingOrders = false;
  currentUserId: number | null = null;

  constructor() {
    // 注册页面用到的 Ionicons 图标
    addIcons({
      documentText,
      time,
      checkmarkDone,
      star,
      heartOutline,
      handLeft,
      heart,
      eye,
      personCircle,
      logOut,
      imageOutline,
      addCircleOutline,
      closeCircle,
      createOutline,
      cameraOutline,
      locationOutline,
      ribbon,
      briefcase,
      starOutline,
      peopleOutline,
    });

    // 订阅登录状态
    this._sub = this.auth.isLoggedIn$.subscribe((v) => {
      this.isLoggedIn = v;
      if (v) {
        void this.loadUserFromStorage();
        this.connectSocket();
        // 登录后如果有待返回的事件ID，自动跳回事件详情
        if (this.returnEventId) {
          const eventId = this.returnEventId;
          this.returnEventId = null;
          this.router.navigate(['/particular'], {
            queryParams: { eventId },
          });
        }
      } else {
        this.resetUserInfo();
      }
    });

    // 监听语言变化
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).tab4;
      // 更新删除按钮文本
      this.updateAlertButtons();
    });
  }

  // 更新删除按钮配置
  private updateAlertButtons() {
    this.alertButtons = [
      {
        text: this.t.cancel,
        role: 'cancel',
        handler: () => {
          this.isDeleteAlertOpen = false;
          this.deleteTargetId = null;
        },
      },
      {
        text: this.t.delete,
        role: 'destructive',
        handler: () => {
          if (this.deleteTargetId != null) {
            void this.deleteTask(this.deleteTargetId);
          }
          this.isDeleteAlertOpen = false;
          this.deleteTargetId = null;
        },
      },
    ];
  }

  // ---- Socket.IO 实时监听订单状态变更 ----
  private connectSocket() {
    if (this.socket?.connected) return;
    this.socket = io(environment.apiBase, {
      auth: { token: this.auth.token },
    });
    this.socket.on('orderStatusUpdate', () => {
      if (this.currentUserId) {
        this.loadOrders(this.currentUserId);
      }
    });
  }

  private disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  ionViewDidEnter() {
    if (this.isLoggedIn) {
      this.connectSocket();
    }
  }

  ionViewWillLeave() {
    this.disconnectSocket();
  }

  // 每次重新进入页面时刷新数据，确保发布/删除后的内容立刻可见
  async ionViewWillEnter() {
    // 监听查询参数
    this.route.queryParams.subscribe((params: any) => {
      if (params['edit'] === 'profile') {
        this.openEditProfileModal();
      }
      // 新增：处理编辑事件参数
      if (params['editEvent']) {
        const eventId = Number(params['editEvent']);
        if (!isNaN(eventId)) {
          this.openEditModal(eventId);
        }
      }
      // 处理事件详情页跳转过来的返回参数
      if (params['returnEventId']) {
        this.returnEventId = Number(params['returnEventId']);
      }
    });

    if (this.isLoggedIn) {
      await this.loadUserFromStorage();
    }
  }

  // Segment 切换事件
  onSectionChange(event: CustomEvent) {
    const value = event.detail.value as 'events' | 'orders' | null;
    if (value) this.activeSection = value;
  }

  setOrderFilter(filter: string) {
    this.orderFilter = filter as typeof this.orderFilter;
  }

  // 根据当前标签筛选显示订单
  getFilteredOrders() {
    if (this.orderFilter === 'all') return this.orders;
    return this.orders.filter((order) => order.statusKey === this.orderFilter);
  }

  // 获取有未完结订单的事件ID集合（用于禁用编辑和删除按钮）
  getBlockedEditIds(): Set<number> {
    const blocked = new Set<number>();
    for (const order of this.orders) {
      // 所有未取消的订单都阻止删除
      if (
        order.statusKey === 'pending' ||
        order.statusKey === 'active' ||
        order.statusKey === 'review' ||
        order.statusKey === 'done'
      ) {
        blocked.add(order.eventId);
      }
    }
    return blocked;
  }

  // 获取有进行中订单的事件ID集合（仅用于禁用编辑按钮）
  getBlockedEditOnlyIds(): Set<number> {
    const blocked = new Set<number>();
    for (const order of this.orders) {
      // 只有进行中的订单才阻止编辑，已完成的不阻止
      if (
        order.statusKey === 'pending' ||
        order.statusKey === 'active' ||
        order.statusKey === 'review'
      ) {
        blocked.add(order.eventId);
      }
    }
    return blocked;
  }

  // 打开删除确认弹窗
  openDeleteAlert(taskId: number) {
    if (this.deletingIds.has(taskId)) return;

    this.deleteTargetId = taskId;
    this.isDeleteAlertOpen = false;
    setTimeout(() => {
      this.isDeleteAlertOpen = true;
    }, 0);
  }

  onDeleteAlertDismiss() {
    this.isDeleteAlertOpen = false;
    this.deleteTargetId = null;
  }

  async deleteTask(taskId: number) {
    if (!this.currentUserId) {
      await this.presentDeleteToast(this.t.notLoggedIn);
      return;
    }

    if (this.deletingIds.has(taskId)) return;
    this.deletingIds.add(taskId);

    const snapshot = [...this.tasks];
    this.tasks = this.tasks.filter((t) => Number(t?.id) !== Number(taskId));

    try {
      const resp = await fetch(`${this.API_BASE}/events/${taskId}`, {
        method: 'DELETE',
        headers: {
          ...this.auth.getAuthHeader(),
        },
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        this.tasks = snapshot;

        if (resp.status === 401) {
          await this.auth.handleAuthExpired();
          return;
        }

        const msg = data?.error || data?.msg || `删除失败（${resp.status}）`;
        await this.presentDeleteToast(msg);
        return;
      }

      if (!data?.success) {
        this.tasks = snapshot;
        await this.presentDeleteToast(data?.error || this.t.networkError);
        return;
      }

      await this.presentDeleteToast(this.t.deleteSuccess);
    } catch (e) {
      console.error('deleteTask error', e);

      this.tasks = snapshot;
      await this.presentDeleteToast(this.t.networkError);
    } finally {
      this.deletingIds.delete(taskId);
    }
  }

  async presentDeleteToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 750,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
    });
    await toast.present();
  }

  async openLoginModal() {
    const modal = await this.modalController.create({
      component: (await import('../login/login.page')).LoginPage,
    });
    await modal.present();
  }

  async openRegisterModal() {
    const modal = await this.modalController.create({
      component: (await import('../register/register.page')).RegisterPage,
    });
    await modal.present();
  }

  editTask(taskId: number) {
    void this.openEditModal(taskId);
  }

  logout() {
    this.auth.logout(); // 登出会触发状态变更
    this.toastController
      .create({
        message: this.t.logoutSuccess,
        duration: 750,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      })
      .then((toast) => toast.present());
  }

  ngOnDestroy(): void {
    this._sub.unsubscribe();
    this.disconnectSocket();
  }

  // 提取的默认用户信息
  private createDefaultUserInfo() {
    return {
      name: '',
      isVerified: this.t.notVerified,
      creditLevel: '',
      goodReviewRate: '',
      buyerRanking: 0,
      providerRole: 0,
      orderCount: 0,
      serviceRanking: 0,
      location: '',
      locationPlaceId: '',
      locationLng: null,
      locationLat: null,
      avatar: '',
      introduction: '',
      realName: '',
      idCardNumber: '',
      birthDate: '',
      stats: { favorites: 0, views: 0, follows: 0 },
    };
  }

  // 重置用户信息（登出时调用）
  resetUserInfo() {
    this.userInfo = this.createDefaultUserInfo();
    this.tasks = []; // 清空任务列表
    this.orders = [];
    this.currentUserId = null;
    this.deletingIds.clear();
    this.disconnectSocket();
  }

  // 统一更新用户信息的工具方法
  private updateUserFromData(data: any): void {
    this.userInfo.name = data.UserName || data.userName || '';
    this.userInfo.location = data.Location || data.location || '';
    this.userInfo.locationPlaceId =
      data.LocationPlaceId || data.locationPlaceId || '';
    this.userInfo.locationLng =
      data.LocationLng != null ? Number(data.LocationLng) : null;
    this.userInfo.locationLat =
      data.LocationLat != null ? Number(data.LocationLat) : null;
    this.userInfo.introduction = data.Introduction || data.introduction || '';
    this.userInfo.avatar = data.UserAvatar || data.userAvatar || '';
    this.userInfo.buyerRanking =
      Number(data.BuyerRanking || data.buyerRanking) || 0;
    this.userInfo.providerRole =
      Number(data.ProviderRole || data.providerRole) || 0;
    this.userInfo.orderCount = Number(data.OrderCount || data.orderCount) || 0;
    this.userInfo.serviceRanking =
      Number(data.ServiceRanking || data.serviceRanking) || 0;
    this.userInfo.realName = data.RealName || data.realName || '';
    this.userInfo.idCardNumber = data.IdCardNumber || data.idCardNumber || '';
    this.userInfo.birthDate = data.BirthDate || data.birthDate || '';

    const vs = data.VerificationStatus ?? data.verificationStatus;
    if (vs === 1) this.userInfo.isVerified = this.t.verified;
    else if (vs === 2) this.userInfo.isVerified = this.t.rejected;
    else if (vs === 0) this.userInfo.isVerified = this.t.pending;
    else this.userInfo.isVerified = this.t.notVerified;
  }

  // 从 localStorage 加载用户
  async loadUserFromStorage(): Promise<void> {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) {
        return;
      }

      const u = JSON.parse(raw);
      const id = u.UserId || u.userId || u.id;
      this.currentUserId = id ?? null;

      if (id) {
        try {
          const resp = await fetch(`${this.API_BASE}/users/${id}/profile`);
          if (!resp.ok) {
            if (resp.status === 401) {
              await this.auth.handleAuthExpired();
              return;
            }
          } else {
            const data = await resp.json().catch(() => null);
            if (data?.success && data.user) {
              this.updateUserFromData(data.user);

              await this.loadUserEvents(data.user.UserId);
              await this.loadOrders(data.user.UserId);
              return;
            }
          }
        } catch (e) {
          console.warn('profile fetch failed, fallback to local user', e);
        }
      }

      // fallback: local user
      this.updateUserFromData(u);
      const fid = u.UserId || u.userId || u.id;
      if (fid) this.currentUserId = fid;

      if (fid) {
        await this.loadUserEvents(fid);
        await this.loadOrders(fid);
      }
    } catch (e) {
      console.error('loadUserFromStorage error', e);
    }
  }

  async loadUserEvents(userId: number): Promise<void> {
    try {
      this.isLoadingEvents = true;
      const resp = await fetch(`${this.API_BASE}/users/${userId}/events`);
      if (!resp.ok) {
        if (resp.status === 401) {
          await this.auth.handleAuthExpired();
          return;
        }
        return;
      }

      const data = await resp.json().catch(() => null);
      if (!Array.isArray(data)) return;

      this.tasks = data.map((e: any) => ({
        id: Number(e.EventId),
        publisher: this.userInfo.name || '',
        title: e.EventTitle,
        status: 'published',
        statusKey: 'published',
        createdAt: e.CreateTime || '',
        EventTitle: e.EventTitle,
        EventType: e.EventType ?? 0,
        EventCategory: e.EventCategory || '',
        // 兼容模板中使用的小写字段名
        Location: e.Location || '',
        location: e.Location || '',
        LocationPlaceId: e.LocationPlaceId || '',
        locationPlaceId: e.LocationPlaceId || '',
        LocationLng: e.LocationLng != null ? Number(e.LocationLng) : null,
        locationLng: e.LocationLng != null ? Number(e.LocationLng) : null,
        LocationLat: e.LocationLat != null ? Number(e.LocationLat) : null,
        locationLat: e.LocationLat != null ? Number(e.LocationLat) : null,
        Price: e.Price ?? 0,
        EventDetails: e.EventDetails || '',
        Photos: e.Photos || null,
        photos: e.Photos || null,
      }));
    } catch (e) {
      console.warn('loadUserEvents failed', e);
    } finally {
      this.isLoadingEvents = false;
    }
  }

  async loadOrders(userId: number): Promise<void> {
    try {
      this.isLoadingOrders = true;
      const resp = await fetch(`${this.API_BASE}/orders?role=all`, {
        headers: { ...this.auth.getAuthHeader() },
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          await this.auth.handleAuthExpired();
        }
        return;
      }

      const data = await resp.json().catch(() => null);
      const rows = Array.isArray(data?.orders) ? data.orders : [];
      const mapped = rows
        .filter(
          (o: any) =>
            Number(o.ConsumerId) === userId || Number(o.ProviderId) === userId,
        )
        .map((o: any) => {
          const status = Number(o.OrderStatus);
          const hasReviewed = Number(o.HasReviewed || 0) > 0;
          const otherHasReviewed = Number(o.OtherHasReviewed || 0) > 0;
          let meta;
          if (status === 0) {
            meta = { key: 'pending', label: '待确认', color: 'warning' };
          } else if (status === 1) {
            meta = { key: 'active', label: '进行中', color: 'primary' };
          } else if (status === 2) {
            if (hasReviewed && otherHasReviewed) {
              meta = { key: 'review', label: '双方已评价', color: 'medium' };
            } else if (hasReviewed) {
              meta = {
                key: 'review',
                label: '我方已评价，等待对方',
                color: 'medium',
              };
            } else if (otherHasReviewed) {
              meta = {
                key: 'review',
                label: '对方已评价，待我方评价',
                color: 'medium',
              };
            } else {
              meta = { key: 'review', label: '待评价', color: 'medium' };
            }
          } else if (status === 3) {
            meta = { key: 'done', label: '已完成', color: 'success' };
          } else {
            meta = { key: 'cancelled', label: '已取消', color: 'danger' };
          }

          // 解析事件快照（下单时的事件信息）
          let snapshot = null;
          if (o.EventSnapshot) {
            try {
              snapshot =
                typeof o.EventSnapshot === 'string'
                  ? JSON.parse(o.EventSnapshot)
                  : o.EventSnapshot;
            } catch {
              snapshot = null;
            }
          }

          // 解析快照中的照片列表
          let snapshotPhotos: string[] = [];
          if (snapshot?.Photos) {
            try {
              const raw = snapshot.Photos;
              if (typeof raw === 'string') {
                const parsed = JSON.parse(raw);
                snapshotPhotos = Array.isArray(parsed) ? parsed : [raw];
              } else if (Array.isArray(raw)) {
                snapshotPhotos = raw;
              }
            } catch {
              snapshotPhotos = [];
            }
          }

          return {
            id: Number(o.OrderId),
            eventId: Number(o.EventId),
            consumerId: Number(o.ConsumerId),
            providerId: Number(o.ProviderId),
            title: o.EventTitle || '订单',
            location: o.DetailLocation || '',
            price: o.TransactionPrice || 0,
            creatorName: o.ProviderName || '',
            consumerName: o.ConsumerName || '',
            createdAt: o.OrderCreateTime || '',
            status: meta.label,
            statusKey: meta.key,
            statusColor: meta.color,
            role: Number(o.ConsumerId) === userId ? 'buyer' : 'seller',
            reviewCount: Number(o.ReviewCount || 0),
            hasReviewed: Number(o.HasReviewed || 0) > 0,
            otherHasReviewed: Number(o.OtherHasReviewed || 0) > 0,
            // 快照字段：下单时的事件信息
            snapshot,
            snapshotTitle: snapshot?.EventTitle || o.EventTitle || '',
            snapshotPrice: snapshot?.Price ?? o.TransactionPrice ?? 0,
            snapshotLocation: snapshot?.Location || '',
            snapshotDetails: snapshot?.EventDetails || '',
            snapshotCategory: snapshot?.EventCategory || '',
            snapshotPhotos,
            // 交付地址结构化数据
            deliveryAddress:
              snapshot?.DeliveryAddress || o.DetailLocation || '',
            deliverySpecific: snapshot?.DeliverySpecific || '',
            deliveryAdditionalInfo: snapshot?.DeliveryAdditionalInfo || '',
            // 取消人信息
            cancelledByName: o.CancelledByName || '',
          };
        });

      this.orders = mapped;
      this.orderStats = {
        all: mapped.length,
        pending: mapped.filter(
          (o: { statusKey: string }) => o.statusKey === 'pending',
        ).length,
        active: mapped.filter(
          (o: { statusKey: string }) => o.statusKey === 'active',
        ).length,
        review: mapped.filter(
          (o: { statusKey: string }) => o.statusKey === 'review',
        ).length,
        done: mapped.filter(
          (o: { statusKey: string }) => o.statusKey === 'done',
        ).length,
        cancelled: mapped.filter(
          (o: { statusKey: string }) => o.statusKey === 'cancelled',
        ).length,
      };
    } catch (e) {
      console.error('loadOrders error', e);
    } finally {
      this.isLoadingOrders = false;
    }
  }

  goToEventDetail(eventId: number) {
    void this.router.navigate(['/particular'], {
      queryParams: { eventId },
    });
  }

  openOrderDetail(order: any) {
    this.currentOrderDetail = order;
    this.isOrderDetailModalOpen = true;
  }

  closeOrderDetail() {
    this.isOrderDetailModalOpen = false;
    this.currentOrderDetail = null;
  }

  async confirmOrder(orderId: number) {
    await this.performOrderAction(orderId, 'confirm');
  }

  async completeOrder(orderId: number) {
    await this.performOrderAction(orderId, 'complete');
  }

  async cancelOrder(orderId: number) {
    const alert = await this.alertController.create({
      header: this.t.cancel,
      message: '确定要取消该订单吗？取消后不可恢复。',
      buttons: [
        { text: this.t.cancel, role: 'cancel' },
        {
          text: '确认取消',
          role: 'destructive',
          handler: async () => {
            await this.performOrderAction(orderId, 'cancel');
          },
        },
      ],
    });
    await alert.present();
  }

  private async performOrderAction(
    orderId: number,
    action: 'confirm' | 'complete' | 'cancel',
  ) {
    try {
      const resp = await fetch(`${this.API_BASE}/orders/${orderId}/${action}`, {
        method: 'PUT',
        headers: { ...this.auth.getAuthHeader() },
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success) {
        if (resp.status === 401) {
          await this.auth.handleAuthExpired();
          return;
        }
        await this.presentDeleteToast(data?.error || this.t.networkError);
        return;
      }
      if (this.currentUserId) await this.loadOrders(this.currentUserId);
      const msg =
        action === 'confirm'
          ? '订单已确认'
          : action === 'complete'
            ? '订单已完成'
            : '订单已取消';
      await this.presentDeleteToast(msg);
    } catch (e) {
      console.error('performOrderAction error', e);
      await this.presentDeleteToast(this.t.networkError);
    }
  }

  reviewOrderId: number | null = null;
  isReviewModalOpen = false;
  isSubmittingReview = false;

  openReviewModal(orderId: number) {
    const order = this.orders.find((o) => o.id === orderId);
    if (order?.hasReviewed) {
      this.presentDeleteToast('你已经评价过该订单，请等待对方评价');
      return;
    }
    this.reviewOrderId = orderId;
    this.isReviewModalOpen = true;
  }

  closeReviewModal() {
    this.isReviewModalOpen = false;
    this.reviewOrderId = null;
  }

  async handleReviewSubmit(payload: ReviewSubmitPayload) {
    if (!this.reviewOrderId || !this.currentUserId) return;
    const order = this.orders.find((o) => o.id === this.reviewOrderId);
    if (!order) return;
    const targetUserId =
      order.role === 'buyer' ? order.providerId : order.consumerId;

    this.isSubmittingReview = true;
    try {
      const resp = await fetch(`${this.API_BASE}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.auth.getAuthHeader(),
        },
        body: JSON.stringify({
          OrderId: this.reviewOrderId,
          TargetUserId: targetUserId,
          Score: payload.Score,
          Text: payload.Text,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success) {
        await this.presentDeleteToast(data?.error || this.t.networkError);
        return;
      }
      this.closeReviewModal();
      if (this.currentUserId) await this.loadOrders(this.currentUserId);
      await this.presentDeleteToast('评价已提交');
    } catch (e) {
      console.error('handleReviewSubmit error', e);
      await this.presentDeleteToast(this.t.networkError);
    } finally {
      this.isSubmittingReview = false;
    }
  }

  // ---- 查看评价详情 ----
  reviewDetailOrderId: number | null = null;
  isReviewDetailOpen = false;

  openReviewDetail(orderId: number) {
    this.reviewDetailOrderId = orderId;
    this.isReviewDetailOpen = true;
  }

  closeReviewDetail() {
    this.isReviewDetailOpen = false;
    this.reviewDetailOrderId = null;
  }

  private async openEditModal(taskId: number): Promise<void> {
    if (this.deletingIds.has(taskId)) return;

    const task = this.tasks.find((t) => Number(t?.id) === Number(taskId));
    if (!task) return;

    let source = task;
    if (task.EventDetails == null || task.EventType == null) {
      try {
        const resp = await fetch(`${this.API_BASE}/events/${taskId}`);
        const data = await resp.json().catch(() => null);
        if (resp.ok && data?.success && data?.event) {
          source = { ...task, ...data.event };

          if (!data.event.canCreateOrder) {
            await this.presentDeleteToast(
              '订单进行中或待评价时，不允许编辑事件',
            );
            return;
          }
        }
      } catch (e) {
        console.warn('fetch event detail failed', e);
      }
    }

    this.editingTaskId = taskId;
    this.editingEventData = {
      id: taskId,
      EventTitle: source.EventTitle || source.title || '',
      EventType: source.EventType ?? 0,
      EventCategory: source.EventCategory || '',
      Location: source.Location || '',
      LocationPlaceId: source.LocationPlaceId || '',
      LocationLng:
        source.LocationLng != null ? Number(source.LocationLng) : null,
      LocationLat:
        source.LocationLat != null ? Number(source.LocationLat) : null,
      Price: source.Price ?? 0,
      EventDetails: source.EventDetails || '',
      Photos: source.Photos || source.photos || null,
    };
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.editingTaskId = null;
    this.editingEventData = null;
  }

  async submitEdit(payload: EditEventPayload): Promise<void> {
    if (!this.editingTaskId) return;
    if (this.isSavingEdit) return;

    this.isSavingEdit = true;
    const { formData, photosJson } = payload;

    try {
      const resp = await fetch(
        `${this.API_BASE}/events/${this.editingTaskId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...this.auth.getAuthHeader(),
          },
          body: JSON.stringify({ ...formData, Photos: photosJson }),
        },
      );

      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success) {
        if (resp.status === 401) {
          await this.auth.handleAuthExpired();
          return;
        }

        const msg = data?.error || data?.msg || `保存失败（${resp.status}）`;
        await this.presentDeleteToast(msg);
        return;
      }

      const idx = this.tasks.findIndex(
        (t) => Number(t?.id) === Number(this.editingTaskId),
      );
      if (idx >= 0) {
        const updated = {
          ...this.tasks[idx],
          ...formData,
          title: formData['EventTitle'],
          Photos: photosJson,
        };
        this.tasks = [
          ...this.tasks.slice(0, idx),
          updated,
          ...this.tasks.slice(idx + 1),
        ];
      }

      await this.presentDeleteToast(this.t.saveSuccess);
      this.closeEditModal();
    } catch (e) {
      console.error('submitEdit error', e);
      await this.presentDeleteToast(this.t.networkError);
    } finally {
      this.isSavingEdit = false;
    }
  }

  getAssetUrl(path: string): string {
    if (!path) return '';
    return path.startsWith('http') ? path : `${this.API_BASE}${path}`;
  }

  // 用户信息编辑相关方法

  openEditProfileModal(): void {
    this.editProfileForm.reset({
      UserName: this.userInfo.name || '',
      RealName: this.userInfo.realName || '',
      IdCardNumber: this.userInfo.idCardNumber || '',
      Location: this.userInfo.location || '',
      LocationPlaceId: this.userInfo.locationPlaceId || '',
      LocationLng:
        this.userInfo.locationLng != null
          ? Number(this.userInfo.locationLng)
          : null,
      LocationLat:
        this.userInfo.locationLat != null
          ? Number(this.userInfo.locationLat)
          : null,
      BirthDate: this.userInfo.birthDate || '',
      Introduction: this.userInfo.introduction || '',
    });
    this.profileAvatarPreview = null;
    this.profileAvatarFile = null;
    this.profileAvatarDeleted = false;
    this.isEditProfileModalOpen = true;
  }

  closeEditProfileModal(): void {
    this.isEditProfileModalOpen = false;
    this.profileAvatarPreview = null;
    this.profileAvatarFile = null;
    this.profileAvatarDeleted = false;
    this.editProfileForm.reset();
  }

  triggerProfileAvatarInput(): void {
    this.profileAvatarInput?.nativeElement.click();
  }

  onProfileAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      void this.presentDeleteToast('Please select an image file');
      return;
    }

    // 检查文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      void this.presentDeleteToast('Image size cannot exceed 5MB');
      return;
    }

    this.profileAvatarFile = file;
    this.profileAvatarPreview = URL.createObjectURL(file);
    this.profileAvatarDeleted = false;
    input.value = '';
  }

  removeProfileAvatar(): void {
    if (this.profileAvatarPreview) {
      URL.revokeObjectURL(this.profileAvatarPreview);
    }
    this.profileAvatarPreview = null;
    this.profileAvatarFile = null;
    this.profileAvatarDeleted = true;
    // 清理文件输入框
    if (this.profileAvatarInput?.nativeElement) {
      this.profileAvatarInput.nativeElement.value = '';
    }
  }

  async submitProfileEdit(): Promise<void> {
    if (this.editProfileForm.invalid) {
      const errors: string[] = [];
      if (this.editProfileForm.get('UserName')?.invalid)
        errors.push(`${this.t.userNameLabel} ${this.t.userNamePlaceholder}`);
      if (this.editProfileForm.get('RealName')?.invalid)
        errors.push(`${this.t.realNameLabel} ${this.t.realNamePlaceholder}`);
      if (this.editProfileForm.get('IdCardNumber')?.invalid)
        errors.push(this.t.idCardPlaceholder);
      if (this.editProfileForm.get('Location')?.invalid)
        errors.push(this.t.locationLabelProfile);
      if (this.editProfileForm.get('BirthDate')?.invalid)
        errors.push(this.t.birthDateLabel);
      if (this.editProfileForm.get('Introduction')?.invalid)
        errors.push(this.t.introPlaceholder);
      await this.presentDeleteToast(errors.join('，'));
      return;
    }

    if (!this.currentUserId) {
      await this.presentDeleteToast(this.t.notLoggedIn);
      return;
    }

    if (this.isSavingProfile) return;
    this.isSavingProfile = true;

    let avatarPath: string | null = null;

    try {
      // 如果有新头像，先上传
      if (this.profileAvatarFile) {
        avatarPath = await this.uploadProfileAvatar();
        if (!avatarPath) {
          this.isSavingProfile = false;
          return;
        }
      }

      const payload: any = {
        UserName: this.editProfileForm.value.UserName,
        RealName: this.editProfileForm.value.RealName,
        IdCardNumber: this.editProfileForm.value.IdCardNumber,
        Location: this.editProfileForm.value.Location,
        LocationPlaceId: this.editProfileForm.value.LocationPlaceId || null,
        LocationLng: this.editProfileForm.value.LocationLng ?? null,
        LocationLat: this.editProfileForm.value.LocationLat ?? null,
        BirthDate: this.editProfileForm.value.BirthDate,
        Introduction: this.editProfileForm.value.Introduction || '',
      };

      if (avatarPath) {
        payload.UserAvatar = avatarPath;
      } else if (this.profileAvatarDeleted) {
        // 用户删除了头像，明确设置为 null
        payload.UserAvatar = null;
      }

      const resp = await fetch(
        `${this.API_BASE}/users/${this.currentUserId}/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...this.auth.getAuthHeader(),
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        if (resp.status === 401) {
          if (avatarPath) {
            await this.deleteUploadedFile(avatarPath);
          }
          await this.auth.handleAuthExpired();
          return;
        }

        const msg = data?.error || data?.msg || `保存失败（${resp.status}）`;

        // 如果更新用户信息失败，且已经上传了头像，则删除已上传的头像
        if (avatarPath) {
          await this.deleteUploadedFile(avatarPath);
        }

        await this.presentDeleteToast(msg);
        return;
      }

      // 更新本地用户信息
      this.userInfo.name = payload.UserName;
      this.userInfo.realName = payload.RealName;
      this.userInfo.idCardNumber = payload.IdCardNumber;
      this.userInfo.location = payload.Location;
      this.userInfo.locationPlaceId = payload.LocationPlaceId || '';
      this.userInfo.locationLng = payload.LocationLng ?? null;
      this.userInfo.locationLat = payload.LocationLat ?? null;
      this.userInfo.birthDate = payload.BirthDate;
      this.userInfo.introduction = payload.Introduction;
      if (avatarPath) {
        this.userInfo.avatar = avatarPath;
      } else if (this.profileAvatarDeleted) {
        this.userInfo.avatar = '';
      }

      // 更新 localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.UserName = payload.UserName;
      storedUser.RealName = payload.RealName;
      storedUser.IdCardNumber = payload.IdCardNumber;
      storedUser.Location = payload.Location;
      storedUser.LocationPlaceId = payload.LocationPlaceId || '';
      storedUser.LocationLng = payload.LocationLng ?? null;
      storedUser.LocationLat = payload.LocationLat ?? null;
      storedUser.BirthDate = payload.BirthDate;
      storedUser.Introduction = payload.Introduction;
      if (avatarPath) {
        storedUser.UserAvatar = avatarPath;
      } else if (this.profileAvatarDeleted) {
        storedUser.UserAvatar = '';
      }
      localStorage.setItem('user', JSON.stringify(storedUser));

      await this.presentDeleteToast(this.t.saveSuccess);
      this.closeEditProfileModal();
    } catch (e) {
      console.error('submitProfileEdit error', e);

      // 如果出现异常且已经上传了头像，则删除已上传的头像
      if (avatarPath) {
        await this.deleteUploadedFile(avatarPath);
      }

      await this.presentDeleteToast(this.t.networkError);
    } finally {
      this.isSavingProfile = false;
    }
  }

  openEditProfileModalFromButton(): void {
    this.openEditProfileModal();
  }

  private async uploadProfileAvatar(): Promise<string | null> {
    if (!this.profileAvatarFile) return null;

    const fd = new FormData();
    fd.append('images', this.profileAvatarFile);

    try {
      const resp = await fetch(`${this.API_BASE}/upload/images`, {
        method: 'POST',
        body: fd,
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success || !Array.isArray(data.paths)) {
        await this.presentDeleteToast(data?.error || 'Avatar upload failed');
        return null;
      }

      return data.paths[0] || null;
    } catch (e) {
      console.error('uploadProfileAvatar error', e);
      await this.presentDeleteToast(this.t.networkError);
      return null;
    }
  }

  // 删除已上传的文件（当更新用户信息失败时回滚）
  private async deleteUploadedFile(filePath: string): Promise<void> {
    try {
      await fetch(`${this.API_BASE}/upload/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
      });
    } catch (e) {
      console.error('deleteUploadedFile error', e);
    }
  }

  // ---- 收藏弹窗 ----
  async openFavoritesModal() {
    this.isFavoritesModalOpen = true;
    await this.loadFavorites();
  }

  closeFavoritesModal() {
    this.isFavoritesModalOpen = false;
  }

  async loadFavorites() {
    this.isLoadingFavorites = true;
    try {
      const resp = await fetch(`${this.API_BASE}/favorites`, {
        headers: this.auth.getAuthHeader(),
      });
      const data = await resp.json().catch(() => null);
      if (data?.success && Array.isArray(data.favorites)) {
        this.favoritesList = data.favorites.map((f: any) => ({
          id: String(f.EventId),
          title: f.EventTitle,
          address: f.Location,
          price: f.Price,
          demand: f.EventDetails,
          createTime: f.CreateTime,
          cardImage: (() => {
            try {
              const photos = JSON.parse(f.Photos || '[]');
              return Array.isArray(photos) ? photos[0] : photos;
            } catch {
              return f.Photos || '';
            }
          })(),
          creatorId: f.CreatorId,
          name: f.UserName || '',
          avatar: f.UserAvatar || '',
          distance: '',
        }));
      }
    } catch (e) {
      console.error('loadFavorites error', e);
    } finally {
      this.isLoadingFavorites = false;
    }
  }

  onFavoriteCardClick(event: EventCardData) {
    this.isFavoritesModalOpen = false;
    this.cdr.detectChanges();
    this.goToEventDetail(Number(event.id));
  }

  // ---- 关注弹窗 ----
  async openFollowsModal() {
    this.isFollowsModalOpen = true;
    await this.loadFollows();
  }

  closeFollowsModal() {
    this.isFollowsModalOpen = false;
  }

  async loadFollows() {
    this.isLoadingFollows = true;
    try {
      const resp = await fetch(`${this.API_BASE}/follows`, {
        headers: this.auth.getAuthHeader(),
      });
      const data = await resp.json().catch(() => null);
      if (data?.success && Array.isArray(data.follows)) {
        this.followsList = data.follows;
      }
    } catch (e) {
      console.error('loadFollows error', e);
    } finally {
      this.isLoadingFollows = false;
    }
  }

  async removeFollow(userId: number) {
    const result = await this.auth.toggleFollow(userId);
    if (result === false) {
      this.followsList = this.followsList.filter((f) => f.UserId !== userId);
      await this.presentDeleteToast('已取消关注');
    }
  }

  goToUserFromFollow(user: any) {
    this.isFollowsModalOpen = false;
    this.cdr.detectChanges();
    this.router.navigate(['/user-particular'], {
      queryParams: { name: user.UserName, userId: user.UserId },
    });
  }
}
