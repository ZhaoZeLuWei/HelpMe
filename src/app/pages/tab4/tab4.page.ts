import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { Subscription } from 'rxjs';
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
  IonList,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ModalController,
} from '@ionic/angular/standalone';

import { ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../services/language.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Tab4ProfileCardComponent } from '../../components/tab4-profile-card/tab4-profile-card.component';
import { Tab4EventsPanelComponent } from '../../components/tab4-events-panel/tab4-events-panel.component';
import { Tab4OrdersPanelComponent } from '../../components/tab4-orders-panel/tab4-orders-panel.component';

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
    IonList,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    ReactiveFormsModule,
    Tab4ProfileCardComponent,
    Tab4EventsPanelComponent,
    Tab4OrdersPanelComponent,
  ],
})
export class Tab4Page implements OnDestroy {
  private readonly API_BASE = environment.apiBase;

  private readonly auth = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly modalController = inject(ModalController);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly langService = inject(LanguageService);

  @ViewChild('editFileInput')
  editFileInput!: ElementRef<HTMLInputElement>;

  @ViewChild('profileAvatarInput')
  profileAvatarInput!: ElementRef<HTMLInputElement>;

  isLoggedIn = false;
  private readonly _sub: Subscription;

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

  // 编辑弹窗状态
  isEditModalOpen = false;
  editingTaskId: number | null = null;
  isSavingEdit = false;
  readonly EDIT_MAX = 5;
  editExistingPhotos: string[] = [];
  editNewPhotos: Array<{ file: File; preview: string }> = [];
  editForm: FormGroup = this.fb.group({
    EventTitle: ['', Validators.required],
    EventType: [0, Validators.required],
    EventCategory: ['', Validators.required],
    Location: ['', Validators.required],
    LocationPlaceId: [''],
    LocationLng: [null],
    LocationLat: [null],
    Price: [0, [Validators.min(0), Validators.max(1_000_000)]],
    EventDetails: ['', Validators.required],
  });

  async openLocationPicker(formType: 'eventEdit' | 'profileEdit') {
    const form =
      formType === 'eventEdit' ? this.editForm : this.editProfileForm;

    const modal = await this.modalController.create({
      component: LocationPickerComponent,
      componentProps: {
        selectedPlaceId: form.get('LocationPlaceId')?.value || '',
        selectedText: form.get('Location')?.value || '',
      },
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role !== 'confirm' || !data?.selected) return;

    const picked: PickedLocation = data.selected;
    form.patchValue({
      Location: picked.text,
      LocationPlaceId: picked.placeId,
      LocationLng: picked.lng,
      LocationLat: picked.lat,
    });
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
  eventFilter: 'all' | 'published' | 'pending' | 'active' | 'review' | 'done' =
    'all';
  orderFilter: 'all' | 'pending' | 'active' | 'review' | 'done' = 'all';

  userInfo: any = this.createDefaultUserInfo();
  tasks: any[] = [];
  orders: any[] = [];
  orderStats = { all: 0, pending: 0, active: 0, review: 0, done: 0 };
  eventStats = {
    all: 0,
    published: 0,
    pending: 0,
    active: 0,
    review: 0,
    done: 0,
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
    });

    // 订阅登录状态
    this._sub = this.auth.isLoggedIn$.subscribe((v) => {
      this.isLoggedIn = v;
      if (v) {
        void this.loadUserFromStorage();
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

  setEventFilter(filter: string) {
    this.eventFilter = filter as typeof this.eventFilter;
  }

  setOrderFilter(filter: string) {
    this.orderFilter = filter as typeof this.orderFilter;
  }

  // 根据当前标签筛选显示事件
  getFilteredEvents() {
    if (this.eventFilter === 'all') return this.tasks;
    return this.tasks.filter((event) => event.statusKey === this.eventFilter);
  }

  // 根据当前标签筛选显示订单
  getFilteredOrders() {
    if (this.orderFilter === 'all') return this.orders;
    return this.orders.filter((order) => order.statusKey === this.orderFilter);
  }

  // 获取有进行中/待评价订单的事件ID集合（用于禁用编辑按钮）
  getBlockedEditIds(): Set<number> {
    const blocked = new Set<number>();
    for (const order of this.orders) {
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

  getEventStatusText(statusKey: string): string {
    const map: Record<string, string> = {
      published: '我发布的',
      pending: '待确认',
      active: '进行中',
      review: '待评价',
      done: '已完成',
    };
    return map[statusKey] || '未知';
  }

  getEventStatusColor(statusKey: string): string {
    const map: Record<string, string> = {
      published: 'primary',
      pending: 'warning',
      active: 'tertiary',
      review: 'medium',
      done: 'success',
    };
    return map[statusKey] || 'medium';
  }

  getOrderStatusText(statusKey: string): string {
    const map: Record<string, string> = {
      pending: '待确认',
      active: '进行中',
      review: '待评价',
      done: '已完成',
    };
    return map[statusKey] || '未知';
  }

  getOrderStatusColor(statusKey: string): string {
    const map: Record<string, string> = {
      pending: 'warning',
      active: 'primary',
      review: 'medium',
      done: 'success',
    };
    return map[statusKey] || 'medium';
  }

  getOrderActionLabel(order: any): string {
    if (order.statusKey === 'pending' && order.role === 'seller')
      return '确认订单';
    if (order.statusKey === 'active' && order.role === 'buyer')
      return '确认完成';
    if (order.statusKey === 'review' && !order.hasReviewed) return '去评价';
    if (order.statusKey === 'review' && order.hasReviewed)
      return '已评价，等待对方';
    return '查看详情';
  }

  isOrderActionEnabled(order: any): boolean {
    if (order.statusKey === 'review' && order.hasReviewed) return false;
    return (
      (order.statusKey === 'pending' && order.role === 'seller') ||
      (order.statusKey === 'active' && order.role === 'buyer') ||
      order.statusKey === 'review'
    );
  }

  // !!!!!以下跳转函数为占位，后续接入路由或 API
  goToFollow() {
    console.log('跳转到关注页面');
    //后续接入API
  }

  goToFavorites() {
    console.log('跳转到收藏页面');
    //后续跳转
  }

  goToViews() {
    console.log('跳转到浏览记录页面');
    //后续跳转
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

  viewDetails(taskId: number) {
    console.log(`查看任务详情 ${taskId}`);
    //后续跳转详情页
  }

  // 任务状态的UI显示
  getStatusText(status: string): string {
    const map: Record<string, string> = {
      published: this.t.statusPublished,
      inProgress: this.t.statusInProgress,
      completed: this.t.statusCompleted,
      review: this.t.statusPendingReview,
    };
    return map[status] || this.t.statusUnknown;
  }

  // 根据认证状态显示数据
  getVerificationColor(status: string): string {
    if (status === this.t.verified) return 'success';
    if (status === this.t.rejected) return 'danger';
    if (status === this.t.pending) return 'warning';
    return 'medium';
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
    this.currentUserId = null;
    this.deletingIds.clear();
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

  // 格式化评分显示
  formatRating(value: any): string {
    const num = Number(value) || 0;
    return num.toFixed(1);
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
        id: e.EventId,
        publisher: this.userInfo.name || '',
        title: e.EventTitle,
        status: 'published',
        statusKey: 'published',
        createdAt: e.CreateTime || '',
        EventTitle: e.EventTitle,
        EventType: e.EventType ?? 0,
        EventCategory: e.EventCategory || '',
        Location: e.Location || '',
        LocationPlaceId: e.LocationPlaceId || '',
        LocationLng: e.LocationLng != null ? Number(e.LocationLng) : null,
        LocationLat: e.LocationLat != null ? Number(e.LocationLat) : null,
        Price: e.Price ?? 0,
        EventDetails: e.EventDetails || '',
        Photos: e.Photos || null,
      }));

      this.eventStats = {
        all: this.tasks.length,
        published: this.tasks.filter((e: any) => e.statusKey === 'published')
          .length,
        pending: this.tasks.filter((e: any) => e.statusKey === 'pending')
          .length,
        active: this.tasks.filter((e: any) => e.statusKey === 'active').length,
        review: this.tasks.filter((e: any) => e.statusKey === 'review').length,
        done: this.tasks.filter((e: any) => e.statusKey === 'done').length,
      };
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
          const meta =
            status === 0
              ? { key: 'pending', label: '待确认', color: 'warning' }
              : status === 1
                ? { key: 'active', label: '进行中', color: 'primary' }
                : status === 2
                  ? { key: 'review', label: '待评价', color: 'medium' }
                  : { key: 'done', label: '已完成', color: 'success' };

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

  async confirmOrder(orderId: number) {
    await this.performOrderAction(orderId, 'confirm');
  }

  async completeOrder(orderId: number) {
    await this.performOrderAction(orderId, 'complete');
  }

  private async performOrderAction(
    orderId: number,
    action: 'confirm' | 'complete',
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
      await this.presentDeleteToast(
        action === 'confirm' ? '订单已确认' : '订单已完成',
      );
    } catch (e) {
      console.error('performOrderAction error', e);
      await this.presentDeleteToast(this.t.networkError);
    }
  }

  reviewOrderId: number | null = null;
  isReviewModalOpen = false;
  reviewForm: FormGroup = this.fb.group({
    Score: [5, [Validators.required]],
    Text: ['', [Validators.maxLength(200)]],
  });

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
    this.reviewForm.reset({ Score: 5, Text: '' });
  }

  async submitReview() {
    if (!this.reviewOrderId || this.reviewForm.invalid || !this.currentUserId)
      return;
    const order = this.orders.find((o) => o.id === this.reviewOrderId);
    if (!order) return;
    const targetUserId =
      order.role === 'buyer' ? order.providerId : order.consumerId;

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
          Score: this.reviewForm.value.Score,
          Text: this.reviewForm.value.Text || '',
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
      console.error('submitReview error', e);
      await this.presentDeleteToast(this.t.networkError);
    }
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

          // 检查是否有进行中或待评价的订单
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
    this.resetEditPhotos();
    this.editExistingPhotos = this.normalizePhotos(
      source.Photos || source.photos,
    );
    this.editForm.reset({
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
    });
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.editingTaskId = null;
    this.resetEditPhotos();
  }

  getEditPhotoItems(): Array<{
    preview: string;
    isExisting: boolean;
    index: number;
  }> {
    const existing = this.editExistingPhotos.map((p, i) => ({
      preview: this.getAssetUrl(p),
      isExisting: true,
      index: i,
    }));
    const next = this.editNewPhotos.map((p, i) => ({
      preview: p.preview,
      isExisting: false,
      index: i,
    }));
    return [...existing, ...next];
  }

  getEditPhotoCount(): number {
    return this.editExistingPhotos.length + this.editNewPhotos.length;
  }

  triggerEditFileInput(): void {
    if (this.getEditPhotoCount() >= this.EDIT_MAX) {
      void this.presentDeleteToast(`${this.t.uploadHint}`);
      return;
    }
    this.editFileInput?.nativeElement.click();
  }

  onEditFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const remaining = this.EDIT_MAX - this.getEditPhotoCount();
    const pick = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, remaining);

    for (const f of pick) {
      this.editNewPhotos.push({ file: f, preview: URL.createObjectURL(f) });
    }

    input.value = '';
  }

  removeEditPhoto(type: 'existing' | 'new', index: number): void {
    if (type === 'existing') {
      this.editExistingPhotos.splice(index, 1);
      return;
    }

    const removed = this.editNewPhotos[index];
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    this.editNewPhotos.splice(index, 1);
  }

  private collectEditFormErrors(): string[] {
    const msgs: string[] = [];
    if (this.editForm.get('EventTitle')?.invalid)
      msgs.push(this.t.titleRequired);
    if (this.editForm.get('EventCategory')?.invalid)
      msgs.push(this.t.categoryRequired);
    if (this.editForm.get('Location')?.invalid)
      msgs.push(this.t.locationRequired);
    if (this.editForm.get('EventDetails')?.invalid)
      msgs.push(this.t.detailsRequired);
    if (this.editForm.get('Price')?.invalid) msgs.push(this.t.priceInvalid);
    return msgs;
  }

  async submitEdit(): Promise<void> {
    if (this.editForm.invalid) {
      await this.presentDeleteToast(this.collectEditFormErrors().join('，'));
      return;
    }

    if (!this.editingTaskId) return;
    if (this.isSavingEdit) return;

    this.isSavingEdit = true;
    const payload = this.editForm.getRawValue();

    const uploaded = await this.uploadEditPhotos();
    if (uploaded == null) {
      this.isSavingEdit = false;
      return;
    }
    const allPhotos = [...this.editExistingPhotos, ...uploaded];
    const photosPayload =
      allPhotos.length > 0 ? JSON.stringify(allPhotos) : null;

    try {
      const resp = await fetch(
        `${this.API_BASE}/events/${this.editingTaskId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...this.auth.getAuthHeader(),
          },
          body: JSON.stringify({ ...payload, Photos: photosPayload }),
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
          ...payload,
          title: payload.EventTitle,
          Photos: photosPayload,
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

  private async uploadEditPhotos(): Promise<string[] | null> {
    if (this.editNewPhotos.length === 0) return [];

    const fd = new FormData();
    for (const p of this.editNewPhotos) {
      fd.append('images', p.file);
    }

    try {
      const resp = await fetch(`${this.API_BASE}/upload/images`, {
        method: 'POST',
        body: fd,
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success || !Array.isArray(data.paths)) {
        await this.presentDeleteToast(data?.error || this.t.networkError);
        return null;
      }
      return data.paths;
    } catch (e) {
      console.error('uploadEditPhotos error', e);
      await this.presentDeleteToast(this.t.networkError);
      return null;
    }
  }

  private resetEditPhotos(): void {
    for (const p of this.editNewPhotos) {
      if (p.preview) URL.revokeObjectURL(p.preview);
    }
    this.editNewPhotos = [];
    this.editExistingPhotos = [];
  }

  private normalizePhotos(photos: any): string[] {
    if (!photos) return [];
    if (Array.isArray(photos)) return photos.filter(Boolean);
    if (typeof photos === 'string') {
      const raw = photos.trim();
      if (!raw) return [];
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.filter(Boolean);
      } catch {
        return [raw];
      }
      return [raw];
    }
    return [];
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
}
