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
  documentText,
  time,
  checkmarkDone,
  star,
  heartOutline,
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
  IonAvatar,
  IonButton,
  IonBadge,
  IonButtons,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonItem,
  IonText,
  IonAlert,
  IonModal,
  IonList,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  ModalController,
} from '@ionic/angular/standalone';

import { ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

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
    IonAvatar,
    IonButtons,
    IonButton,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonItem,
    IonText,
    IonAlert,
    IonModal,
    IonList,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    ReactiveFormsModule,
  ],
})
export class Tab4Page implements OnDestroy {
  private readonly API_BASE = environment.apiBase;

  private readonly auth = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly modalController = inject(ModalController);
  private readonly fb = inject(FormBuilder);

  @ViewChild('editFileInput')
  editFileInput!: ElementRef<HTMLInputElement>;

  @ViewChild('profileAvatarInput')
  profileAvatarInput!: ElementRef<HTMLInputElement>;

  isLoggedIn = false;
  private readonly _sub: Subscription;

  // 用户信息编辑相关
  isEditProfileModalOpen = false;
  isSavingProfile = false;
  profileAvatarPreview: string | null = null;
  profileAvatarFile: File | null = null;
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
    Price: [0, [Validators.min(0), Validators.max(1_000_000)]],
    EventDetails: ['', Validators.required],
  });

  // 删除按钮配置
  alertButtons = [
    {
      text: '取消',
      role: 'cancel',
      handler: () => {
        this.isDeleteAlertOpen = false;
        this.deleteTargetId = null;
      },
    },
    {
      text: '删除',
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

  activeTab: string = 'published';

  userInfo: any = this.createDefaultUserInfo();
  tasks: any[] = [];
  currentUserId: number | null = null;

  constructor() {
    // 注册页面用到的 Ionicons 图标
    addIcons({
      documentText,
      time,
      checkmarkDone,
      star,
      heartOutline,
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
  }

  // 每次重新进入页面时刷新数据，确保发布/删除后的内容立刻可见
  async ionViewWillEnter() {
    if (this.isLoggedIn) {
      await this.loadUserFromStorage();
    }
  }

  // Segment 切换事件
  onTabChange(event: CustomEvent) {
    this.activeTab = event.detail.value;
  }

  // 根据当前标签筛选显示任务
  getFilteredTasks() {
    return this.tasks.filter((task) => task.status === this.activeTab);
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
      await this.presentDeleteToast('未登录，无法删除');
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

        const msg =
          data?.error ||
          data?.msg ||
          (resp.status === 401
            ? '未登录或登录已过期'
            : `删除失败（${resp.status}）`);
        await this.presentDeleteToast(msg);
        return;
      }

      if (!data?.success) {
        this.tasks = snapshot;
        await this.presentDeleteToast(data?.error || '删除失败');
        return;
      }

      await this.presentDeleteToast('删除成功');
    } catch (e) {
      console.error('deleteTask error', e);

      this.tasks = snapshot;
      await this.presentDeleteToast('网络错误，稍后重试');
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

  goToReview(taskId: number) {
    console.log(`去评价 ${taskId}`);
    //后续跳转评价页
  }

  // 任务状态的UI显示
  getStatusText(status: string): string {
    const map: Record<string, string> = {
      published: '已发布',
      inProgress: '进行中',
      completed: '已完成',
      review: '待评价',
    };
    return map[status] || '未知';
  }

  // 任务状态的颜色
  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      published: 'primary',
      inProgress: 'warning',
      completed: 'success',
      review: 'medium',
    };
    return map[status] || 'medium';
  }

  // 根据认证状态显示数据
  getVerificationColor(status: string): string {
    if (status === '已认证') return 'success';
    if (status === '被驳回') return 'danger';
    if (status === '待审核') return 'warning';
    return 'medium';
  }

  logout() {
    this.auth.logout(); // 登出会触发状态变更
    this.toastController
      .create({
        message: '已成功登出',
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
      isVerified: '未认证',
      creditLevel: '',
      goodReviewRate: '',
      buyerRanking: 0,
      providerRole: 0,
      orderCount: 0,
      serviceRanking: 0,
      location: '',
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
    if (vs === 1) this.userInfo.isVerified = '已认证';
    else if (vs === 2) this.userInfo.isVerified = '被驳回';
    else if (vs === 0) this.userInfo.isVerified = '待审核';
    else this.userInfo.isVerified = '未认证';
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
          if (resp.ok) {
            const data = await resp.json().catch(() => null);
            if (data?.success && data.user) {
              this.updateUserFromData(data.user);

              await this.loadUserEvents(data.user.UserId);
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

      if (fid) await this.loadUserEvents(fid);
    } catch (e) {
      console.error('loadUserFromStorage error', e);
    }
  }

  async loadUserEvents(userId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.API_BASE}/users/${userId}/events`);
      if (!resp.ok) return;

      const data = await resp.json().catch(() => null);
      if (!Array.isArray(data)) return;

      this.tasks = data.map((e: any) => ({
        id: e.EventId,
        publisher: this.userInfo.name || '',
        title: e.EventTitle,
        status: 'published',
        createdAt: e.CreateTime || '',
        EventTitle: e.EventTitle,
        EventType: e.EventType ?? 0,
        EventCategory: e.EventCategory || '',
        Location: e.Location || '',
        Price: e.Price ?? 0,
        EventDetails: e.EventDetails || '',
        Photos: e.Photos || null,
      }));
    } catch (e) {
      console.warn('loadUserEvents failed', e);
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
      void this.presentDeleteToast(`最多只能上传 ${this.EDIT_MAX} 张图片`);
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
    if (this.editForm.get('EventTitle')?.invalid) msgs.push('标题必填');
    if (this.editForm.get('EventCategory')?.invalid) msgs.push('类别必填');
    if (this.editForm.get('Location')?.invalid) msgs.push('位置必填');
    if (this.editForm.get('EventDetails')?.invalid) msgs.push('详细描述必填');
    if (this.editForm.get('Price')?.invalid)
      msgs.push('价格需在 0 ~ 1000000 之间');
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
        const msg =
          data?.error ||
          data?.msg ||
          (resp.status === 401
            ? '未登录或登录已过期'
            : `保存失败（${resp.status}）`);
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

      await this.presentDeleteToast('保存成功');
      this.closeEditModal();
    } catch (e) {
      console.error('submitEdit error', e);
      await this.presentDeleteToast('网络错误，稍后重试');
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
        await this.presentDeleteToast(data?.error || '图片上传失败');
        return null;
      }
      return data.paths;
    } catch (e) {
      console.error('uploadEditPhotos error', e);
      await this.presentDeleteToast('图片上传失败，请稍后重试');
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
      BirthDate: this.userInfo.birthDate || '',
      Introduction: this.userInfo.introduction || '',
    });
    this.profileAvatarPreview = null;
    this.profileAvatarFile = null;
    this.isEditProfileModalOpen = true;
  }

  closeEditProfileModal(): void {
    this.isEditProfileModalOpen = false;
    this.profileAvatarPreview = null;
    this.profileAvatarFile = null;
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
      void this.presentDeleteToast('请选择图片文件');
      return;
    }

    // 检查文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      void this.presentDeleteToast('图片大小不能超过5MB');
      return;
    }

    this.profileAvatarFile = file;
    this.profileAvatarPreview = URL.createObjectURL(file);
    input.value = '';
  }

  removeProfileAvatar(): void {
    if (this.profileAvatarPreview) {
      URL.revokeObjectURL(this.profileAvatarPreview);
    }
    this.profileAvatarPreview = null;
    this.profileAvatarFile = null;
    // 清理文件输入框
    if (this.profileAvatarInput?.nativeElement) {
      this.profileAvatarInput.nativeElement.value = '';
    }
  }

  async submitProfileEdit(): Promise<void> {
    if (this.editProfileForm.invalid) {
      const errors: string[] = [];
      if (this.editProfileForm.get('UserName')?.invalid)
        errors.push('用户名必填（2-20个字符）');
      if (this.editProfileForm.get('RealName')?.invalid)
        errors.push('真实姓名必填（2-20个字符）');
      if (this.editProfileForm.get('IdCardNumber')?.invalid)
        errors.push('身份证号格式不正确');
      if (this.editProfileForm.get('Location')?.invalid)
        errors.push('所在地必填');
      if (this.editProfileForm.get('BirthDate')?.invalid)
        errors.push('出生日期必填');
      if (this.editProfileForm.get('Introduction')?.invalid)
        errors.push('个人介绍最多200字');
      await this.presentDeleteToast(errors.join('，'));
      return;
    }

    if (!this.currentUserId) {
      await this.presentDeleteToast('未登录，无法保存');
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
        BirthDate: this.editProfileForm.value.BirthDate,
        Introduction: this.editProfileForm.value.Introduction || '',
      };

      if (avatarPath) {
        payload.UserAvatar = avatarPath;
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
        const msg =
          data?.error ||
          data?.msg ||
          (resp.status === 401
            ? '未登录或登录已过期'
            : `保存失败（${resp.status}）`);

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
      this.userInfo.birthDate = payload.BirthDate;
      this.userInfo.introduction = payload.Introduction;
      if (avatarPath) {
        this.userInfo.avatar = avatarPath;
      }

      // 更新 localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.UserName = payload.UserName;
      storedUser.RealName = payload.RealName;
      storedUser.IdCardNumber = payload.IdCardNumber;
      storedUser.Location = payload.Location;
      storedUser.BirthDate = payload.BirthDate;
      storedUser.Introduction = payload.Introduction;
      if (avatarPath) {
        storedUser.UserAvatar = avatarPath;
      }
      localStorage.setItem('user', JSON.stringify(storedUser));

      await this.presentDeleteToast('保存成功');
      this.closeEditProfileModal();
    } catch (e) {
      console.error('submitProfileEdit error', e);

      // 如果出现异常且已经上传了头像，则删除已上传的头像
      if (avatarPath) {
        await this.deleteUploadedFile(avatarPath);
      }

      await this.presentDeleteToast('网络错误，稍后重试');
    } finally {
      this.isSavingProfile = false;
    }
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
        await this.presentDeleteToast(data?.error || '头像上传失败');
        return null;
      }

      return data.paths[0] || null;
    } catch (e) {
      console.error('uploadProfileAvatar error', e);
      await this.presentDeleteToast('头像上传失败，请稍后重试');
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
