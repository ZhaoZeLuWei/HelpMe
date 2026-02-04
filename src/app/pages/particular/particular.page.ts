import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonContent, IonHeader, IonToolbar, IonIcon, IonButtons, IonFooter, IonRow,IonCol,IonBadge} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { EventCardData } from '../../components/show-event/show-event.component';
import { ModalController } from '@ionic/angular/standalone';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-particular',
  templateUrl: './particular.page.html',
  styleUrls: ['./particular.page.scss'],
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
    IonBadge
  ],
})
export class ParticularPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  readonly apiBase = environment.apiBase;

  isCurrentUserCreator: boolean = false;

  // 新增 userInfo 对象，模拟队友的数据结构
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
    CreateTime: '' // 注册时间
  };

  event: EventCardData | null = null;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const eventId = params['eventId'];
      if (eventId) {
        // 根据eventId从后端获取完整数据
        this.loadEventDetail(eventId);
      }
    });
  }

// 新增方法：根据ID获取事件详情
  async loadEventDetail(eventId: string) {
    try {
      const resp = await fetch(`${this.apiBase}/events/${eventId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && data?.event) {
          const rawEvent = data.event;
          // 解析图片
          let cardImage = null;
          if (rawEvent.Photos) {
            try {
              const photos = JSON.parse(rawEvent.Photos);
              cardImage = Array.isArray(photos) ? photos[0] : photos;
            } catch {
              cardImage = rawEvent.Photos;
            }
          }
          // 转换字段名以匹配 EventCardData
          this.event = {
            id: rawEvent.EventId,
            title: rawEvent.EventTitle,
            address: rawEvent.Location,
            price: rawEvent.Price,
            demand: rawEvent.EventDetails,
            createTime: rawEvent.CreateTime,
            cardImage: cardImage,
            creatorId: rawEvent.CreatorId,
            name: '',
            avatar: '',
            icon: 'navigate-outline',
            distance: '距500m'
          };
          // 加载发布者信息
          if (this.event?.creatorId) {
            this.loadUserFromStorage(this.event.creatorId);
          }
          // 检查当前用户是否是事件创建者
          this.checkUserIsCreator();
        }
      }
    } catch (error) {
      console.error('加载事件详情失败:', error);
    }
  }

// 根据 ID 加载活动详情
// 根据 ID 加载活动详情
  async loadEventById(eventId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.apiBase}/events/${eventId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && data.event) {
          // 解析图片数组
          let cardImage = null;
          if (data.event.Photos) {
            try {
              const photos = JSON.parse(data.event.Photos);
              cardImage = Array.isArray(photos) ? photos[0] : photos;
            } catch {
              cardImage = data.event.Photos;
            }
          }

          // 创建符合 EventCardData 的对象
          const eventData: EventCardData = {
            id: data.event.EventId,
            title: data.event.EventTitle,
            address: data.event.Location,
            price: data.event.Price,
            demand: data.event.EventDetails,
            createTime: data.event.CreateTime,
            cardImage: cardImage,
            creatorId: data.event.CreatorId,
            name: '',
            avatar: '',
            icon: 'navigate-outline',
            distance: '距500m'
          };

          this.event = eventData;

          // 加载发布者信息
          if (this.event.creatorId) {
            await this.loadUserFromStorage(this.event.creatorId);
          }
        }
      }
    } catch (e) {
      console.error('加载活动详情失败:', e);
    }
  }

  /* 新增：直接使用 tab4 的 loadUserFromStorage 方法 ===================== */
  async loadUserFromStorage(userId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/profile`);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (data?.success && data.user) {
          // 更新 userInfo
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

  // 获取头像URL，处理默认值
  getAvatarUrl(avatarPath?: string): string {
    if (!avatarPath || avatarPath.trim() === '') {
      return '/assets/icon/user.svg'; // 默认头像路径
    }
    // 检查是否已经是完整URL
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    // 拼接API基础URL
    return environment.apiBase + avatarPath;
  }
  // 新增：根据 providerRole 返回服务等级文本
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

// 新增：根据 providerRole 返回对应颜色
  getServiceRoleColor(providerRole: number): string {
    switch (providerRole) {
      case 1:
        return 'warning'; // 黄色
      case 2:
        return 'success'; // 绿色
      default:
        return 'medium'; // 灰色
    }
  }
// 新增：跳转到用户详情页面
  goToUserParticular() {
    if (this.userInfo.name) {
      this.router.navigate(['/user-particular'], {
        queryParams: {
          name: this.userInfo.name,
          userId: this.event?.creatorId
        }
      });
    }
  }
  // 返回上一页
  goBack() {
    // 尝试返回上一页，如果没有历史则回首页
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/tabs/tab1']);
    }
  }

  // 关注按钮点击事件
  onFollow() {
    console.log('关注按钮点击');
  }

  // 收藏按钮点击事件
  onCollect() {
    console.log('收藏按钮点击');
  }

  checkUserIsCreator() {
    const currentUserId = this.authService.currentUserId;
    const creatorId = this.event?.creatorId;
    this.isCurrentUserCreator = currentUserId !== null && creatorId !== null && currentUserId === creatorId;
  }

  async onChat() {
    const currentUserId = this.authService.currentUserId;
    if (!currentUserId) {
      console.log('请先登录');
      const { LoginPage } = await import('../login/login.page');
      const modal = await this.modalCtrl.create({
        component: LoginPage
      });

      // 监听 Modal 关闭
      modal.onDidDismiss().then(() => {
        // 重新检查用户登录状态
        const newUserId = this.authService.currentUserId;
        if (newUserId) {
          // 登录成功，刷新页面数据
          window.location.reload();
        }
      });

      await modal.present();
      return;
    }

    if (this.isCurrentUserCreator) {
      console.log('不能与自己聊天');
      return;
    }

    const chatData = {
      EventId: this.event?.id,
      CreaterId: this.event?.creatorId,
      PartnerId: currentUserId
    };
    console.log('聊天数据:', chatData);
  }
}
