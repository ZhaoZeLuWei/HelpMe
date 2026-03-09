import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonContent, IonHeader, IonToolbar, IonIcon, IonButtons, IonFooter, IonRow, IonCol, IonTitle, IonBadge, ModalController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  calendarOutline,
  chatbubbleOutline,
  timeOutline,
  heartOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-user-particular',
  templateUrl: './user-particular.page.html',
  styleUrls: ['./user-particular.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonIcon,
    IonButtons,
    IonFooter,
    IonRow,
    IonCol,
    IonTitle,
    IonBadge,
  ],
})
export class UserParticularPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  readonly apiBase = environment.apiBase;

  isCurrentUser: boolean = false;

  // 用户信息
  userInfo: any = {
    name: '',
    location: '',
    introduction: '',
    avatar: '',
    buyerRanking: 0,
    providerRole: 0,
    orderCount: 0,
    serviceRanking: 0,
    isVerified: '未认证',
    stats: { favorites: 0, views: 0, follows: 0 },
    CreateTime: ''
  };

  userId: number | null = null;

// 在 UserParticularPage 类中添加以下属性
// 标签页导航
  activeTab: string = 'active-events'; // 默认显示发布的活动栏

// 三个栏目的数据
  activeEvents: any[] = []; // 正在进行的活动
  userComments: any[] = []; // 用户评价
  activityFeed: any[] = []; // 活动动态

  constructor() {
    // 注册图标
    addIcons({
      chevronBackOutline,
      calendarOutline,
      chatbubbleOutline,
      timeOutline,
      heartOutline
    });
  }

// 在 ngOnInit 方法中添加数据加载
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.userInfo.name = params['name'] || '';
      this.userId = params['userId'] ? Number(params['userId']) : null;

      // 如果有 userId，加载用户详情和相关数据
      if (this.userId) {
        this.loadUserFromStorage(this.userId);
        this.loadActiveEvents(this.userId);
        this.loadUserComments(this.userId);
        this.loadActivityFeed(this.userId);
        this.checkIsCurrentUser();
      }
    });
  }

  checkIsCurrentUser() {
    const currentUserId = this.authService.currentUserId;
    this.isCurrentUser = currentUserId !== null && this.userId !== null && currentUserId === this.userId;
  }

// 添加以下方法
// 切换标签页
  switchTab(tab: string) {
    this.activeTab = tab;
  }

// 加载用户正在进行的活动
  async loadActiveEvents(userId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/events`);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (Array.isArray(data)) {
          // 如果没有status字段，直接使用所有活动
          this.activeEvents = data;
        }
      }
    } catch (e) {
      console.error('loadActiveEvents error', e);
    }
  }

// 加载用户评价
  async loadUserComments(userId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/comments`);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (data?.success) {
          this.userComments = data.comments || [];
        }
      } else if (resp.status === 404) {
        // 评论 API 未实现，设置为空数组
        this.userComments = [];
        console.log('Comments API not implemented, setting empty array');
      }
    } catch (e) {
      console.error('loadUserComments error', e);
      this.userComments = [];
    }
  }
  // 获取评论者头像URL
  getCommentAvatarUrl(avatarPath?: string): string {
    if (!avatarPath || avatarPath.trim() === '') {
      return '/assets/icon/user.svg';
    }
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return environment.apiBase + avatarPath;
  }

// 加载用户活动动态
  async loadActivityFeed(userId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/events`);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (Array.isArray(data)) {
          // 按日期排序所有活动，创建动态 feed
          this.activityFeed = [...data]
            .sort((a, b) => {
              const dateA = new Date(a.CreateTime || 0).getTime();
              const dateB = new Date(b.CreateTime || 0).getTime();
              return dateB - dateA; // 降序排列，最新的在前
            })
            .map(event => ({
              id: event.EventId,
              title: event.EventTitle,
              description: event.EventDetails || '暂无描述',
              activityType: this.getActivityType(event.status),
              date: event.CreateTime
            }));
        }
      }
    } catch (e) {
      console.error('loadActivityFeed error', e);
    }
  }

  // 获取活动类型文本
  getActivityType(status: string): string {
    const map: Record<string, string> = {
      published: '发布活动',
      inProgress: '活动进行中',
      completed: '活动完成',
      review: '待评价'
    };
    return map[status] || '活动';
  }
// 格式化日期
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 加载用户信息
  async loadUserFromStorage(userId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/profile`);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (data?.success && data.user) {
          this.userInfo.name = data.user.UserName || '';
          this.userInfo.location = data.user.Location || '';
          this.userInfo.introduction = data.user.Introduction || '';
          this.userInfo.avatar = data.user.UserAvatar || '';
          this.userInfo.buyerRanking = data.user.BuyerRanking ?? 0;
          this.userInfo.providerRole = data.user.ProviderRole ?? 0;
          this.userInfo.orderCount = data.user.OrderCount ?? 0;
          this.userInfo.serviceRanking = data.user.ServiceRanking ?? 0;
          this.userInfo.CreateTime = data.user.CreateTime || '';
        }
      }
    } catch (e) {
      console.error('loadUserFromStorage error', e);
    }
  }

  // 获取服务等级文本
  getServiceRoleText(providerRole: number): string {
    switch (providerRole) {
      case 1:
        return '热心用户';
      case 2:
        return '服务达人';
      default:
        return '普通用户';
    }
  }

  // 获取服务等级颜色
  getServiceRoleColor(providerRole: number): string {
    switch (providerRole) {
      case 1:
        return 'warning';
      case 2:
        return 'success';
      default:
        return 'medium';
    }
  }

  // 获取头像URL
  getAvatarUrl(avatarPath?: string): string {
    if (!avatarPath || avatarPath.trim() === '') {
      return '/assets/icon/user.svg';
    }
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return environment.apiBase + avatarPath;
  }
// 跳转到活动详情页
  goToEventDetail(event: any) {
    // 优先使用 EventId，如果没有则使用 id
    const eventId = event.EventId || event.id;

    if (!eventId) {
      console.error('Event ID not found:', event);
      return;
    }

    this.router.navigate(['/particular'], {
      queryParams: {
        eventId: eventId,
        title: event.EventTitle || event.title
      }
    });
  }
  // 返回上一页
  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/tabs/tab1']);
    }
  }

  async onChat() {
    const currentUserId = this.authService.currentUserId;
    if (!currentUserId) {
      console.log('请先登录');
      const { LoginPage } = await import('../login/login.page');
      const modal = await this.modalCtrl.create({
        component: LoginPage
      });
      modal.onDidDismiss().then(() => {
        const newUserId = this.authService.currentUserId;
        if (newUserId) {
          window.location.reload();
        }
      });
      await modal.present();
      return;
    }

    if (this.isCurrentUser) {
      console.log('不能与自己聊天');
      return;
    }


    const chatData = {
      TargetUserId: this.userId,
      PartnerId: currentUserId
    };
    console.log('聊天数据:', chatData);
  }
  async onFollow() {
    const currentUserId = this.authService.currentUserId;
    if (!currentUserId) {
      console.log('请先登录');
      const { LoginPage } = await import('../login/login.page');
      const modal = await this.modalCtrl.create({
        component: LoginPage
      });
      modal.onDidDismiss().then(() => {
        const newUserId = this.authService.currentUserId;
        if (newUserId) {
          window.location.reload();
        }
      });
      await modal.present();
      return;
    }
    console.log('关注按钮点击');
  }
}
