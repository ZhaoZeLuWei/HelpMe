import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
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
} from '@ionic/angular/standalone';

import { ToastController } from '@ionic/angular';
import { LoginPage } from '../login/login.page';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
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
    LoginPage,
  ],
})
export class Tab4Page implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly toastController = inject(ToastController);

  isLoggedIn = false;
  private readonly _sub: Subscription;

  // 删除确认弹窗状态
  isDeleteAlertOpen = false;

  deleteTargetId: number | null = null; // 待删除任务的 ID（null 表示未选择）
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
          this.deleteTask(this.deleteTargetId);
        }
        this.isDeleteAlertOpen = false;
        this.deleteTargetId = null;
      },
    },
  ];

  activeTab: string = 'published';

  userInfo: any = this.createDefaultUserInfo();
  tasks: any[] = [];

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
    this.deleteTargetId = taskId;
    this.isDeleteAlertOpen = true;
  }

  deleteTask(taskId: number) {
    // 更新任务列表
    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    void this.presentDeleteToast();
    //后续调用删除API
  }

  async presentDeleteToast() {
    const toast = await this.toastController.create({
      message: '删除成功',
      duration: 3000,
      position: 'bottom',
    });
    await toast.present();
  }

  editTask(taskId: number) {
    console.log(`编辑任务 ${taskId}`);
    //后续跳转编辑页
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
      stats: { favorites: 0, views: 0, follows: 0 },
    };
  }

  // 重置用户信息（登出时调用）
  resetUserInfo() {
    this.userInfo = this.createDefaultUserInfo();
    this.tasks = []; // 清空任务列表
  }

  // 统一更新用户信息的工具方法
  private updateUserFromData(data: any): void {
    this.userInfo.name = data.UserName || '';
    this.userInfo.location = data.Location || '';
    this.userInfo.introduction = data.Introduction || '';
    this.userInfo.avatar = data.UserAvatar || '';
    this.userInfo.buyerRanking = data.BuyerRanking ?? 0;
    this.userInfo.providerRole = data.ProviderRole ?? 0;
    this.userInfo.orderCount = data.OrderCount ?? 0;
    this.userInfo.serviceRanking = data.ServiceRanking ?? 0;

    const vs = data.VerificationStatus;
    if (vs === 1) this.userInfo.isVerified = '已认证';
    else if (vs === 2) this.userInfo.isVerified = '被驳回';
    else if (vs === 0) this.userInfo.isVerified = '待审核';
    else this.userInfo.isVerified = '未认证';
  }

  // 从 localStorage 加载用户
  async loadUserFromStorage(): Promise<void> {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return;

      const u = JSON.parse(raw);
      const id = u.UserId || u.userId || u.id;

      if (id) {
        try {
          const resp = await fetch(`http://localhost:3000/users/${id}/profile`);
          if (resp.ok) {
            const data = await resp.json();
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

      // Fallback: 使用 localStorage 中的数据
      this.updateUserFromData(u);
      const fid = u.UserId || u.userId || u.id;

      if (fid) await this.loadUserEvents(fid);
    } catch (e) {
      console.error('loadUserFromStorage error', e);
    }
  }

  async loadUserEvents(userId: number): Promise<void> {
    try {
      const resp = await fetch(`http://localhost:3000/users/${userId}/events`);
      if (!resp.ok) return;

      const data = await resp.json();
      if (!Array.isArray(data)) return;

      this.tasks = data.map((e: any) => ({
        id: e.EventId,
        publisher: this.userInfo.name || '',
        title: e.EventTitle,
        status: 'published',
        createdAt: e.CreateTime || '',
      }));
    } catch (e) {
      console.warn('loadUserEvents failed', e);
    }
  }

  getAssetUrl(path: string): string {
    if (!path) return '';
    return path.startsWith('http') ? path : `http://localhost:3000${path}`;
  }
}
