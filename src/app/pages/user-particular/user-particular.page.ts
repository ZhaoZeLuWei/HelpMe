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
  AlertController,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from 'src/app/services/auth.service';
import { Tab4EventService } from 'src/app/services/tab4/tab4-event.service';
import { Tab4UserService } from 'src/app/services/tab4/tab4-user.service';
import { LanguageService } from 'src/app/services/language.service';
import { resolveMediaUrl } from 'src/app/utils/media-url.util';
import { DynamicTranslationService } from 'src/app/services/dynamic-translation.service';
import { TranslateTextPipe } from 'src/app/pipes/translate-text.pipe';
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
  swapHorizontalOutline,
  pauseCircleOutline,
  playCircleOutline,
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
    TranslateTextPipe,
  ],
})
export class UserParticularPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private toastController = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private languageService = inject(LanguageService);
  private dynTrans = inject(DynamicTranslationService);
  private readonly eventService = inject(Tab4EventService);
  private readonly userService = inject(Tab4UserService);

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
    isVerified: this.languageService.getTranslations('zh').tab4.notVerified,
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
      swapHorizontalOutline,
      pauseCircleOutline,
      playCircleOutline,
    });
  }

  ngOnInit() {
    let isFirstEmit = true;
    // 监听语言变化：切换语言时重新拉取数据（服务端返回译文）
    this.languageService.currentLang$.subscribe((lang) => {
      this.t = this.languageService.getTranslations(lang).userParticular;
      if (isFirstEmit) {
        isFirstEmit = false;
        return;
      }
      if (this.userId) {
        this.loadDataForUser(this.userId);
      }
    });
    this.route.queryParams.subscribe(async (params) => {
      this.userInfo.name = params['name'] || '';
      this.userId = params['userId'] ? Number(params['userId']) : null;

      if (this.userId) {
        await this.loadDataForUser(this.userId);
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

  private get verificationLabels() {
    const tab4 = this.languageService.getTranslations(
      this.languageService.getCurrentLang(),
    ).tab4;
    return {
      verified: tab4.verified,
      rejected: tab4.rejected,
      pending: tab4.pending,
      notVerified: tab4.notVerified,
    };
  }

  private async loadDataForUser(userId: number) {
    await Promise.all([
      this.loadUserProfile(userId),
      this.loadUserEventsData(userId),
      this.loadUserComments(userId),
    ]);
    this.checkIsCurrentUser();
    this.checkFollowStatus();
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  private async loadUserEventsData(userId: number): Promise<void> {
    try {
      const rows = await this.eventService.fetchUserEventsRaw(userId);
      this.activeEvents = rows.filter((item: any) => Number(item.Status) === 0);
      this.activityFeed = [...rows]
        .filter((item: any) => Number(item.Status) !== 2)
        .sort((a, b) => {
          const dateA = new Date(a.CreateTime || 0).getTime();
          const dateB = new Date(b.CreateTime || 0).getTime();
          return dateB - dateA;
        })
        .map((event) => ({
          id: event.EventId,
          title: event.EventTitle,
          description: event.EventDetails || this.t.noDescription,
          activityType: this.getActivityType(event.Status),
          date: event.CreateTime,
          EventType: event.EventType,
          Status: event.Status,
        }));
    } catch (e) {
      console.error('loadUserEventsData error', e);
    }
  }

  async loadUserComments(userId: number): Promise<void> {
    try {
      this.userComments = await this.userService.fetchUserComments(userId);
    } catch (e) {
      console.error('loadUserComments error', e);
      this.userComments = [];
    }
  }

  getCommentAvatarUrl(avatarPath?: string): string {
    return resolveMediaUrl(avatarPath);
  }

  getActivityType(status: number): string {
    if (status === 0) return this.t.activityPublished;
    if (status === 1) return this.t.activityCompleted;
    return this.t.activityDefault;
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

  private async loadUserProfile(userId: number): Promise<void> {
    try {
      const profile = await this.userService.fetchProfile(userId);
      if (profile.unauthorized) {
        await this.authService.handleAuthExpired();
        return;
      }
      if (profile.user) {
        this.userService.applyUserData(
          this.userInfo,
          profile.user,
          this.verificationLabels,
        );
        this.userInfo.CreateTime = profile.user.CreateTime || '';
      }
    } catch (e) {
      console.error('loadUserProfile error', e);
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
    return resolveMediaUrl(avatarPath);
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

  /** 切换事件上架/下架状态 */
  async toggleEventStatus(event: any, e: Event) {
    e.stopPropagation();

    const currentStatus = Number(event.Status ?? 0);
    const willDeactivate = currentStatus === 0;

    const alert = await this.alertCtrl.create({
      header: willDeactivate ? this.t.deactivateTitle : this.t.activateTitle,
      message: willDeactivate
        ? this.t.deactivateMessage
        : this.t.activateMessage,
      buttons: [
        { text: this.t.cancel, role: 'cancel' },
        {
          text: this.t.confirm,
          handler: () => this.doToggleStatus(event, willDeactivate ? 1 : 0),
        },
      ],
    });
    await alert.present();
  }

  private async doToggleStatus(event: any, newStatus: number) {
    const eventId = Number(event.EventId ?? event.id);
    const result = await this.eventService.setEventStatus(eventId, newStatus);

    if (result.success) {
      event.Status = result.status ?? newStatus;
      const toast = await this.toastController.create({
        message:
          result.message ||
          (newStatus === 0 ? this.t.eventActivated : this.t.eventDeactivated),
        duration: 2000,
        color: 'success',
        position: 'top',
      });
      await toast.present();
      return;
    }

    if (result.unauthorized) {
      await this.authService.handleAuthExpired();
      return;
    }

    const toast = await this.toastController.create({
      message: result.error || this.t.toggleFailed,
      duration: 2000,
      color: 'danger',
      position: 'top',
    });
    await toast.present();
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
      this.userInfo.followerCount = Math.max(
        0,
        (this.userInfo.followerCount || 0) + (result ? 1 : -1),
      );
      const toast = await this.toastController.create({
        message: result ? this.t.followed : this.t.unfollowed,
        duration: 2000,
        position: 'bottom',
      });
      await toast.present();
    }
  }
}
