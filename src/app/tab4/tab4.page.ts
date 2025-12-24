import { CommonModule } from '@angular/common';
import { Component, NgZone, OnDestroy } from '@angular/core';
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
  trash,
  create,
  checkmarkCircle,
  starHalf,
  chatbubbles,
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
import { AuthService } from '../services/auth.service';

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
  isLoggedIn = false;
  private _sub: any;

  constructor(private zone: NgZone, private auth: AuthService, private toastController: ToastController) {
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
      trash,
      create,
      checkmarkCircle,
      starHalf,
      chatbubbles,
      logOut,
    });
    // 订阅登录状态
    this._sub = this.auth.isLoggedIn$.subscribe(v => this.zone.run(() => this.isLoggedIn = v));
  }
  // 删除确认弹窗状态
  isDeleteAlertOpen = false;

  deleteTargetId: number | null = null;     // 待删除任务的 ID（null 表示未选择）
  alertButtons = [
    {
      text: '取消',
      role: 'cancel',
      handler: () => {
        this.zone.run(() => {
          this.isDeleteAlertOpen = false;
          this.deleteTargetId = null;
        });
      },
    },
    {
      text: '删除',
      role: 'destructive',
      handler: () => {
        this.zone.run(() => {
          if (this.deleteTargetId != null) {
            this.deleteTask(this.deleteTargetId);
          }
          this.isDeleteAlertOpen = false;
          this.deleteTargetId = null;
        });
      },
    },
  ];

  activeTab: string = 'published';

  // 用户信息（示例数据）
  userInfo = {
    name: '张三',
    isVerified: '已验证',
    creditLevel: '优秀',
    goodReviewRate: '100%',
    stats: {
      favorites: 5,
      views: 20,
      follows: 10
    }
  };

  // 任务列表（示例数据）
  tasks = [
    { id: 1, publisher: '张三', title: '买药', status: 'published', createdAt: '2025-12-20' },
    { id: 2, publisher: '张三', title: '代取快递', status: 'inProgress', createdAt: '2025-12-21' },
    { id: 3, publisher: '张三', title: '陪诊', status: 'completed', createdAt: '2025-12-22' },
    { id: 4, publisher: '张三', title: '超市代购', status: 'completed', createdAt: '2025-12-23' },
    { id: 5, publisher: '张三', title: '挂号', status: 'published', createdAt: '2000-01-01' },
    { id: 6, publisher: '张三', title: '送文件', status: 'review', createdAt: '2000-01-02' }
  ];


  // Segment 切换事件
  onTabChange(event: CustomEvent) {
    this.activeTab = event.detail.value;
  }

  // 根据当前标签筛选显示任务
  getFilteredTasks() {
    return this.tasks.filter(task => task.status === this.activeTab);
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
    // 使用 zone.run 确保变更检测立即触发
    this.zone.run(() => {
      this.tasks = this.tasks.filter(t => t.id !== taskId);
    });
    // 显示删除成功的提示
    this.presentDeleteToast();
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
      review: '待评价'
    };
    return map[status] || '未知';
  }

  // 任务状态的颜色
  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      published: 'primary',
      inProgress: 'warning',
      completed: 'success',
      review: 'medium'
    };
    return map[status] || 'medium';
  }

  logout() {
    this.zone.run(() => {
      this.auth.logout();
    });
  }

  ngOnDestroy(): void {
    if (this._sub) this._sub.unsubscribe();
  }
}