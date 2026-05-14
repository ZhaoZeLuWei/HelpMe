import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonToolbar,
  IonIcon,
  IonButtons,
  IonTitle,
  IonBadge,
  ModalController,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { LanguageService } from 'src/app/services/language.service';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  calendarOutline,
  chatbubbleOutline,
  timeOutline,
  heartOutline,
  homeOutline,
  createOutline,
  handLeftOutline,
  heart,
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
  private toastController = inject(ToastController);
  private languageService = inject(LanguageService);
  readonly apiBase = environment.apiBase;

  // 翻译对象 - 声明时就初始化
  t = this.languageService.getTranslations('zh').userParticular;

  isCurrentUser: boolean = false;
  isFollowing: boolean = false;

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
    CreateTime: '',
  };

  userId: number | null = null;

  activeTab: string = 'active-events';

  activeEvents: any[] = [];
  userComments: any[] = [];
  activityFeed: any[] = [];

  constructor() {
    addIcons({
      chevronBackOutline,
      calendarOutline,
      chatbubbleOutline,
      timeOutline,
      heartOutline,
      homeOutline,
      createOutline,
      handLeftOutline,
      heart,
    });
  }

  ngOnInit() {
    // 监听语言变化
    this.languageService.currentLang$.subscribe((lang) => {
      this.t = this.languageService.getTranslations(lang).userParticular;
    });
    this.route.queryParams.subscribe((params) => {
      this.userInfo.name = params['name'] || '';
      this.userId = params['userId'] ? Number(params['userId']) : null;

      if (this.userId) {
        this.loadUserFromStorage(this.userId);
        this.loadActiveEvents(this.userId);
        this.loadUserComments(this.userId);
        this.loadActivityFeed(this.userId);
        this.checkIsCurrentUser();
        this.checkFollowStatus();
      }
    });
  }

  checkIsCurrentUser() {
    const currentUserId = this.authService.currentUserId;
    this.isCurrentUser =
      currentUserId !== null &&
      this.userId !== null &&
      currentUserId === this.userId;
  }

  async checkFollowStatus() {
    if (this.isCurrentUser || !this.userId) return;
    this.isFollowing = await this.authService.checkFollow(this.userId);
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  async loadActiveEvents(userId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/events`);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (Array.isArray(data)) {
          this.activeEvents = data;
        }
      }
    } catch (e) {
      console.error('loadActiveEvents error', e);
    }
  }

  async loadUserComments(userId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/comments`);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (data?.success) {
          this.userComments = data.comments || [];
        }
      } else if (resp.status === 404) {
        this.userComments = [];
        console.log('Comments API not implemented, setting empty array');
      }
    } catch (e) {
      console.error('loadUserComments error', e);
      this.userComments = [];
    }
  }

  getCommentAvatarUrl(avatarPath?: string): string {
    if (!avatarPath || avatarPath.trim() === '') {
      return '/assets/icon/user.svg';
    }
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return environment.apiBase + avatarPath;
  }

  async loadActivityFeed(userId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/events`);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (Array.isArray(data)) {
          this.activityFeed = [...data]
            .sort((a, b) => {
              const dateA = new Date(a.CreateTime || 0).getTime();
              const dateB = new Date(b.CreateTime || 0).getTime();
              return dateB - dateA;
            })
            .map((event) => ({
              id: event.EventId,
              title: event.EventTitle,
              description: event.EventDetails || this.t.noDescription,
              activityType: this.getActivityType(event.status),
              date: event.CreateTime,
              EventType: event.EventType,
            }));
        }
      }
    } catch (e) {
      console.error('loadActivityFeed error', e);
    }
  }

  getActivityType(status: string): string {
    const map: Record<string, string> = {
      published: this.t.activityPublished,
      inProgress: this.t.activityInProgress,
      completed: this.t.activityCompleted,
      review: this.t.activityReview,
    };
    return map[status] || this.t.activityDefault;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

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

  getServiceRoleText(providerRole: number): string {
    switch (providerRole) {
      case 1:
        return this.t.roleEnthusiast;
      case 2:
        return this.t.roleProfessional;
      case 3:
        return this.t.roleMerchant;
      default:
        return this.t.roleRegular;
    }
  }

  getServiceRoleColor(providerRole: number): string {
    switch (providerRole) {
      case 1:
        return 'warning';
      case 2:
        return 'success';
      case 3:
        return 'success';
      default:
        return 'medium';
    }
  }

  getTypeIcon(eventType: number): string {
    return eventType === 1 ? 'heart' : 'hand-left-outline';
  }

  getTypeText(eventType: number): string {
    return eventType === 1 ? this.t.typeHelp : this.t.typeRequest;
  }

  getTypeColor(eventType: number): string {
    return eventType === 1 ? '#E11D48' : '#0F766E';
  }

  getAvatarUrl(avatarPath?: string): string {
    if (!avatarPath || avatarPath.trim() === '') {
      return '/assets/icon/user.svg';
    }
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return environment.apiBase + avatarPath;
  }

  ionViewWillLeave() {
    (document.activeElement as HTMLElement)?.blur();
  }

  goToEditProfile() {
    this.router.navigate(['/tabs/tab4'], { queryParams: { edit: 'profile' } });
  }

  goToEventDetail(event: any) {
    const eventId = event.EventId || event.id;

    if (!eventId) {
      console.error('Event ID not found:', event);
      return;
    }

    this.router.navigate(['/particular'], {
      queryParams: {
        eventId: eventId,
        title: event.EventTitle || event.title,
      },
    });
  }
  goToEditEvent(eventId: number) {
    this.router.navigate(['/tabs/tab4'], {
      queryParams: { editEvent: eventId },
    });
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/tabs/tab1']);
    }
  }

  goHome() {
    this.router.navigate(['/tabs/tab1']);
  }

  async onChat() {
    const currentUserId = this.authService.currentUserId;
    if (!currentUserId) {
      const toast = await this.toastController.create({
        message: this.t.loginRequired,
        duration: 2000,
        position: 'bottom',
      });
      await toast.present();
      this.router.navigate(['/tabs/tab4']);
      return;
    }

    if (this.isCurrentUser) {
      console.log('不能与自己聊天');
      return;
    }
    this.router.navigate(['/chat-detail'], {
      state: { targetUser: this.userInfo },
      replaceUrl: true,
    });

    const chatData = {
      TargetUserId: this.userId,
      PartnerId: currentUserId,
    };
    console.log('聊天数据:', chatData);
  }

  async onFollow() {
    const currentUserId = this.authService.currentUserId;
    if (!currentUserId) {
      const toast = await this.toastController.create({
        message: this.t.loginRequired,
        duration: 2000,
        position: 'bottom',
      });
      await toast.present();
      this.router.navigate(['/tabs/tab4']);
      return;
    }
    if (!this.userId) return;
    const result = await this.authService.toggleFollow(this.userId);
    if (result !== null) {
      this.isFollowing = result;
      const toast = await this.toastController.create({
        message: result ? this.t.followed : this.t.unfollowed,
        duration: 2000,
        position: 'bottom',
      });
      await toast.present();
    }
  }
}
