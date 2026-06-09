import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  ViewChild,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { LocationPickerService } from '../../services/location-picker.service';
import { RealtimeService } from '../../services/realtime.service';

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
  people,
  peopleOutline,
  receiptOutline,
  clipboardOutline,
  chevronForward,
  chatbubbleEllipses,
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
  IonAlert,
  ModalController,
} from '@ionic/angular/standalone';

import { ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../services/language.service';
import { DynamicTranslationService } from '../../services/dynamic-translation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Tab4LoginPromptComponent } from '../../components/tab4-login-prompt/tab4-login-prompt.component';
import { Tab4QuickActionsComponent } from '../../components/tab4-quick-actions/tab4-quick-actions.component';
import { Tab4ProfileCardComponent } from '../../components/tab4-profile-card/tab4-profile-card.component';
import { Tab4EventsPanelComponent } from '../../components/tab4-events-panel/tab4-events-panel.component';
import { Tab4OrdersPanelComponent } from '../../components/tab4-orders-panel/tab4-orders-panel.component';
import {
  Tab4EditProfileModalComponent,
  Tab4ProfileSavedPayload,
} from '../../components/tab4-edit-profile-modal/tab4-edit-profile-modal.component';
import { Tab4FavoritesModalComponent } from '../../components/tab4-favorites-modal/tab4-favorites-modal.component';
import { Tab4UserListModalComponent } from '../../components/tab4-user-list-modal/tab4-user-list-modal.component';
import { Tab4OrderDetailModalComponent } from '../../components/tab4-order-detail-modal/tab4-order-detail-modal.component';
import { EventCardData } from '../../components/show-event/show-event.component';
import { mapFavoritesToEventCards } from '../../utils/event-card.mapper';
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
import { Tab4OrderService } from '../../services/tab4/tab4-order.service';
import { Tab4EventService } from '../../services/tab4/tab4-event.service';
import { Tab4UserService } from '../../services/tab4/tab4-user.service';
import {
  Tab4Order,
  Tab4OrderFilter,
  Tab4OrderStats,
  Tab4UserTask,
} from '../../services/tab4/tab4.types';

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
    IonAlert,
    Tab4LoginPromptComponent,
    Tab4QuickActionsComponent,
    Tab4ProfileCardComponent,
    Tab4EventsPanelComponent,
    Tab4OrdersPanelComponent,
    Tab4EditProfileModalComponent,
    Tab4FavoritesModalComponent,
    Tab4UserListModalComponent,
    Tab4OrderDetailModalComponent,
    EditEventModalComponent,
    ReviewModalComponent,
    ReviewDetailModalComponent,
  ],
})
export class Tab4Page implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly modalController = inject(ModalController);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly langService = inject(LanguageService);
  private readonly dynTrans = inject(DynamicTranslationService);
  private readonly orderService = inject(Tab4OrderService);
  private readonly eventService = inject(Tab4EventService);
  private readonly userService = inject(Tab4UserService);
  private readonly locationPicker = inject(LocationPickerService);
  private readonly realtime = inject(RealtimeService);

  @ViewChild('editEventModal')
  editEventModal!: EditEventModalComponent;

  isLoggedIn = false;
  private readonly _sub: Subscription;
  private socket: any = null;
  returnEventId: number | null = null;

  // 翻译对象
  t = this.langService.getTranslations('zh').tab4;

  isEditProfileModalOpen = false;

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

  async openLocationPicker() {
    const sharedModal = this.editEventModal;
    const picked = await this.locationPicker.pickLocation({
      selectedPlaceId: sharedModal?.getFormValue('LocationPlaceId') || '',
      selectedText: sharedModal?.getFormValue('Location') || '',
    });
    if (!picked) return;

    sharedModal?.patchForm({
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
  orderFilter: Tab4OrderFilter = 'all';

  isFavoritesModalOpen = false;
  isFollowsModalOpen = false;
  isFollowersModalOpen = false;
  favoritesCount = 0;
  favoritesCache: EventCardData[] | null = null;
  followsCount = 0;

  userInfo = this.userService.createDefaultUserInfo(
    this.langService.getTranslations('zh').tab4.notVerified,
  );
  tasks: Tab4UserTask[] = [];
  orders: Tab4Order[] = [];
  orderStats: Tab4OrderStats = {
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
      people,
      peopleOutline,
      receiptOutline,
      clipboardOutline,
      chevronForward,
      chatbubbleEllipses,
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

    // 监听语言变化：切换语言时重新拉取数据（服务端返回译文）
    let isFirstLangEmit = true;
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).tab4;
      this.updateAlertButtons();
      if (isFirstLangEmit) {
        isFirstLangEmit = false;
        return;
      }
      if (this.isLoggedIn) {
        this.loadUserFromStorage();
      }
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
    this.socket = this.realtime.connect({ token: this.auth.token });
    this.socket.on('orderStatusUpdate', () => {
      if (this.currentUserId) {
        void this.refreshOrders(this.currentUserId);
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
      // 加载收藏和关注数据用于显示计数
      await this.loadSocialCounts();
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

  getFilteredOrders(): Tab4Order[] {
    return this.orderService.getFilteredOrders(this.orders, this.orderFilter);
  }

  getBlockedEditIds(): Set<number> {
    return this.orderService.getBlockedEditIds(this.orders);
  }

  getBlockedEditOnlyIds(): Set<number> {
    return this.orderService.getBlockedEditOnlyIds(this.orders);
  }

  getBlockedToggleIds(): Set<number> {
    return this.orderService.getBlockedToggleIds(this.orders);
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
      const result = await this.eventService.deleteEvent(taskId);
      if (!result.success) {
        this.tasks = snapshot;
        if (result.unauthorized) {
          await this.auth.handleAuthExpired();
          return;
        }
        await this.presentDeleteToast(result.error || this.t.networkError);
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

  async confirmLogout() {
    const alert = await this.alertController.create({
      header: this.t.logout,
      message: this.t.logoutConfirm || '确定要退出登录吗？',
      buttons: [
        {
          text: this.t.cancel || '取消',
          role: 'cancel',
        },
        {
          text: this.t.logout,
          role: 'destructive',
          handler: () => {
            this.logout();
          },
        },
      ],
    });
    await alert.present();
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

  resetUserInfo() {
    this.userInfo = this.userService.createDefaultUserInfo(this.t.notVerified);
    this.tasks = []; // 清空任务列表
    this.orders = [];
    this.currentUserId = null;
    this.deletingIds.clear();
    this.disconnectSocket();
  }

  private get verificationLabels() {
    return {
      verified: this.t.verified,
      rejected: this.t.rejected,
      pending: this.t.pending,
      notVerified: this.t.notVerified,
    };
  }

  async loadUserFromStorage(): Promise<void> {
    try {
      const { user, userId } = this.userService.parseStoredUser();
      if (!user) return;

      this.currentUserId = userId;

      if (userId) {
        const profile = await this.userService.fetchProfile(userId);
        if (profile.unauthorized) {
          await this.auth.handleAuthExpired();
          return;
        }
        if (profile.user) {
          this.userService.applyUserData(
            this.userInfo,
            profile.user,
            this.verificationLabels,
          );
          await this.refreshUserData(profile.user.UserId);
          this.triggerDynamicTranslation();
          return;
        }
      }

      this.userService.applyUserData(
        this.userInfo,
        user,
        this.verificationLabels,
      );
      const fid = user.UserId || user.userId || user.id;
      if (fid) {
        this.currentUserId = Number(fid);
        await this.refreshUserData(Number(fid));
        this.triggerDynamicTranslation();
      }
    } catch (e) {
      console.error('loadUserFromStorage error', e);
    }
  }

  private async refreshUserData(userId: number): Promise<void> {
    await Promise.all([this.refreshEvents(userId), this.refreshOrders(userId)]);
  }

  private async refreshEvents(userId: number): Promise<void> {
    this.isLoadingEvents = true;
    try {
      this.tasks = await this.eventService.loadUserEvents(
        userId,
        this.userInfo.name,
      );
    } finally {
      this.isLoadingEvents = false;
    }
  }

  private async refreshOrders(userId: number): Promise<void> {
    this.isLoadingOrders = true;
    try {
      const result = await this.orderService.loadOrders(userId);
      if (result.unauthorized) {
        await this.auth.handleAuthExpired();
        return;
      }
      this.orders = result.orders;
      this.orderStats = result.orderStats;
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
      message: this.t.orderPanel.cancelOrderConfirmMsg,
      buttons: [
        { text: this.t.cancel, role: 'cancel' },
        {
          text: this.t.orderPanel.cancelOrderConfirmBtn,
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
    const result = await this.orderService.performAction(orderId, action);
    if (!result.success) {
      if (result.unauthorized) {
        await this.auth.handleAuthExpired();
        return;
      }
      await this.presentDeleteToast(result.error || this.t.networkError);
      return;
    }

    if (this.currentUserId) {
      await this.refreshOrders(this.currentUserId);
    }

    const msg =
      action === 'confirm'
        ? '订单已确认'
        : action === 'complete'
          ? '订单已完成'
          : '订单已取消';
    await this.presentDeleteToast(msg);
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
      const result = await this.orderService.submitReview({
        orderId: this.reviewOrderId,
        targetUserId,
        score: payload.Score,
        text: payload.Text,
      });

      if (!result.success) {
        if (result.unauthorized) {
          await this.auth.handleAuthExpired();
          return;
        }
        await this.presentDeleteToast(result.error || this.t.networkError);
        return;
      }

      this.closeReviewModal();
      if (this.currentUserId) {
        await this.refreshOrders(this.currentUserId);
      }
      await this.presentDeleteToast('评价已提交');
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

  /** 切换事件上架/下架状态 */
  async toggleEventStatus(event: any) {
    const currentStatus = Number(event.Status ?? 0);
    const willDeactivate = currentStatus === 0;

    const alert = await this.alertController.create({
      header: willDeactivate
        ? this.t.eventPanel.deactivateTitle || '确认下架'
        : this.t.eventPanel.activateTitle || '确认上架',
      message: willDeactivate
        ? this.t.eventPanel.deactivateMessage ||
          '下架后该事件将不再展示给其他用户，确定要下架吗？'
        : this.t.eventPanel.activateMessage ||
          '上架后该事件将重新展示给其他用户，确定要上架吗？',
      buttons: [
        { text: this.t.eventPanel.cancel || '取消', role: 'cancel' },
        {
          text: this.t.eventPanel.confirm || '确认',
          handler: () =>
            this.doToggleEventStatus(event, willDeactivate ? 1 : 0),
        },
      ],
    });
    await alert.present();
  }

  private async doToggleEventStatus(event: Tab4UserTask, newStatus: number) {
    const result = await this.eventService.setEventStatus(event.id, newStatus);

    if (result.success) {
      event.Status = result.status ?? newStatus;
      const toast = await this.toastController.create({
        message:
          result.message || (newStatus === 0 ? '事件已上架' : '事件已下架'),
        duration: 2000,
        color: 'success',
        position: 'top',
      });
      await toast.present();
      return;
    }

    if (result.unauthorized) {
      await this.auth.handleAuthExpired();
      return;
    }

    const toast = await this.toastController.create({
      message: result.error || '操作失败',
      duration: 2000,
      color: 'danger',
      position: 'top',
    });
    await toast.present();
  }

  closeReviewDetail() {
    this.isReviewDetailOpen = false;
    this.reviewDetailOrderId = null;
  }

  private async openEditModal(taskId: number): Promise<void> {
    if (this.deletingIds.has(taskId)) return;

    const task = this.tasks.find((t) => Number(t.id) === Number(taskId));
    if (!task) return;

    let source = task;
    if (task.EventDetails == null || task.EventType == null) {
      const fetched = await this.eventService.fetchEventForEdit(taskId);
      if (fetched.unauthorized) {
        await this.auth.handleAuthExpired();
        return;
      }
      if (fetched.event) {
        source = { ...task, ...fetched.event };
        if (!fetched.canEdit) {
          await this.presentDeleteToast('订单进行中或待评价时，不允许编辑事件');
          return;
        }
      }
    }

    this.editingTaskId = taskId;
    this.editingEventData = this.eventService.buildEditData(taskId, source);
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.editingTaskId = null;
    this.editingEventData = null;
  }

  async submitEdit(payload: EditEventPayload): Promise<void> {
    if (!this.editingTaskId || this.isSavingEdit) return;

    this.isSavingEdit = true;
    try {
      const result = await this.eventService.updateEvent(
        this.editingTaskId,
        payload,
      );

      if (!result.success) {
        if (result.unauthorized) {
          await this.auth.handleAuthExpired();
          return;
        }
        await this.presentDeleteToast(result.error || this.t.networkError);
        return;
      }

      const idx = this.tasks.findIndex(
        (t) => Number(t.id) === Number(this.editingTaskId),
      );
      if (idx >= 0 && result.formData) {
        const updated = this.eventService.mergeTaskAfterEdit(
          this.tasks[idx],
          result.formData,
          payload.photosJson,
        );
        this.tasks = [
          ...this.tasks.slice(0, idx),
          updated,
          ...this.tasks.slice(idx + 1),
        ];
      }

      await this.presentDeleteToast(this.t.saveSuccess);
      this.closeEditModal();
    } finally {
      this.isSavingEdit = false;
    }
  }

  openEditProfileModal(): void {
    this.isEditProfileModalOpen = true;
  }

  closeEditProfileModal(): void {
    this.isEditProfileModalOpen = false;
  }

  onProfileSaved(payload: Tab4ProfileSavedPayload): void {
    this.userInfo.name = payload.UserName;
    this.userInfo.realName = payload.RealName;
    this.userInfo.idCardNumber = payload.IdCardNumber;
    this.userInfo.location = payload.Location;
    this.userInfo.locationPlaceId = payload.LocationPlaceId || '';
    this.userInfo.locationLng = payload.LocationLng ?? null;
    this.userInfo.locationLat = payload.LocationLat ?? null;
    this.userInfo.birthDate = payload.BirthDate;
    this.userInfo.introduction = payload.Introduction;
    if (payload.UserAvatar !== undefined) {
      this.userInfo.avatar = payload.UserAvatar || '';
    }

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
    if (payload.UserAvatar !== undefined) {
      storedUser.UserAvatar = payload.UserAvatar || '';
    }
    localStorage.setItem('user', JSON.stringify(storedUser));
    this.isEditProfileModalOpen = false;
  }

  openEditProfileModalFromButton(): void {
    this.openEditProfileModal();
  }

  getFavoritesDesc(): string {
    return this.t.favoritesDesc.replace('{count}', String(this.favoritesCount));
  }

  getFollowsDesc(): string {
    return this.t.followsDesc.replace('{count}', String(this.followsCount));
  }

  openFavoritesModal(): void {
    this.isFavoritesModalOpen = true;
  }

  closeFavoritesModal(): void {
    this.isFavoritesModalOpen = false;
  }

  onFavoritesCountChange(count: number): void {
    this.favoritesCount = count;
  }

  onFavoritesListChange(list: EventCardData[]): void {
    this.favoritesCache = list;
  }

  onFavoriteCardClick(event: EventCardData): void {
    this.isFavoritesModalOpen = false;
    this.cdr.detectChanges();
    setTimeout(() => this.goToEventDetail(Number(event.id)), 150);
  }

  openFollowsModal(): void {
    this.isFollowsModalOpen = true;
  }

  closeFollowsModal(): void {
    this.isFollowsModalOpen = false;
  }

  openFollowersModal(): void {
    this.isFollowersModalOpen = true;
  }

  closeFollowersModal(): void {
    this.isFollowersModalOpen = false;
  }

  openSupportChat(): void {
    this.router.navigate(['/support-chat']);
  }

  goToUserFromList(user: any): void {
    this.isFollowsModalOpen = false;
    this.isFollowersModalOpen = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.router.navigate(['/user-particular'], {
        queryParams: { name: user.UserName, userId: user.UserId },
      });
    }, 150);
  }

  private async loadSocialCounts(): Promise<void> {
    const counts = await this.userService.loadSocialCounts();
    this.favoritesCount = counts.favoritesCount;
    this.followsCount = counts.followsCount;
    this.favoritesCache = mapFavoritesToEventCards(counts.favorites);
  }

  private triggerDynamicTranslation(): void {
    setTimeout(() => this.dynTrans.translateAll().subscribe(), 200);
  }
}
