import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronBack,
  chevronForward,
  close,
  homeOutline,
  locationOutline,
  timeOutline,
  cashOutline,
  documentText,
  heart,
  heartOutline,
  star,
  starOutline,
  createOutline,
  chatbubbleOutline,
  pricetagOutline,
} from 'ionicons/icons';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonToolbar,
  IonIcon,
  IonButtons,
  IonFooter,
  IonRow,
  IonCol,
  IonBadge,
  IonModal,
  IonNote,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { EventCardData } from '../../components/show-event/show-event.component';
import { ModalController } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { LanguageService } from 'src/app/services/language.service';
import { DynamicTranslationService } from 'src/app/services/dynamic-translation.service';
import { TranslateTextPipe } from 'src/app/pipes/translate-text.pipe';
import { NavController } from '@ionic/angular';
import {
  LocationPickerComponent,
  type PickedLocation,
} from '../../components/location-picker/location-picker.component';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  EditEventModalComponent,
  EventEditData,
  EditEventPayload,
} from '../../components/edit-event-modal/edit-event-modal.component';

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
    IonBadge,
    IonModal,
    IonNote,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonTitle,
    EditEventModalComponent,
    ReactiveFormsModule,
    TranslateTextPipe,
  ],
})
export class ParticularPage implements OnInit {
  private languageService = inject(LanguageService);
  private dynTrans = inject(DynamicTranslationService);

  // 翻译对象 - 声明时就初始化
  t = this.languageService.getTranslations('zh').particular;

  constructor() {
    addIcons({
      chevronBackOutline,
      chevronBack,
      chevronForward,
      close,
      homeOutline,
      locationOutline,
      timeOutline,
      cashOutline,
      documentText,
      heart,
      heartOutline,
      star,
      starOutline,
      createOutline,
      chatbubbleOutline,
      pricetagOutline,
    });
  }

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private toastController = inject(ToastController);
  private navCtrl = inject(NavController);
  private fb = inject(FormBuilder);
  readonly apiBase = environment.apiBase;

  @ViewChild('editEventModal')
  editEventModal!: EditEventModalComponent;

  isCurrentUserCreator: boolean = false;
  isFavorited: boolean = false;
  isFollowingCreator: boolean = false;
  favoriteCount: number = 0;
  get currentUserId(): number | null {
    return this.authService.currentUserId;
  }

  isEditModalOpen = false;
  editingEventData: EventEditData | null = null;
  isSavingEdit = false;
  isOrderModalOpen = false;
  isSubmittingOrder = false;
  canCreateOrder = true;
  activeOrder: any = null;
  orderForm: FormGroup = this.fb.group({
    DetailLocation: ['', Validators.required],
    SpecificLocation: ['', [Validators.maxLength(100)]],
    AdditionalInfo: ['', [Validators.maxLength(200)]],
  });

  pickedLocationDisplay: string = '';

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

  event: EventCardData | null = null;
  eventPhotos: string[] = [];
  eventTags: string[] = [];
  previewImageUrl: string | null = null;
  previewPhotoIndex = 0;

  ngOnInit() {
    let isFirstEmit = true;
    // 监听语言变化：切换语言时重新拉取数据（服务端返回译文）
    this.languageService.currentLang$.subscribe((lang) => {
      this.t = this.languageService.getTranslations(lang).particular;
      if (isFirstEmit) {
        isFirstEmit = false;
        return;
      }
      if (this.event?.id) {
        this.loadEventDetail(String(this.event.id));
      }
    });
    this.route.queryParams.subscribe((params) => {
      const eventId = params['eventId'];
      if (eventId) {
        this.loadEventDetail(eventId);
      }
    });
  }

  async loadEventDetail(eventId: string) {
    try {
      const resp = await fetch(`${this.apiBase}/events/${eventId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && data?.event) {
          const rawEvent = data.event;
          let cardImage = null;
          this.eventPhotos = [];
          if (rawEvent.Photos) {
            try {
              const photos = JSON.parse(rawEvent.Photos);
              if (Array.isArray(photos)) {
                this.eventPhotos = photos.filter(Boolean);
                cardImage = this.eventPhotos[0] || null;
              } else if (photos) {
                this.eventPhotos = [photos];
                cardImage = photos;
              }
            } catch {
              this.eventPhotos = [rawEvent.Photos];
              cardImage = rawEvent.Photos;
            }
          }
          this.event = {
            id: rawEvent.EventId,
            title: rawEvent.EventTitle,
            address: rawEvent.Location,
            price: rawEvent.Price,
            demand: rawEvent.EventDetails,
            createTime: rawEvent.CreateTime,
            cardImage: cardImage,
            creatorId: Number(rawEvent.CreatorId),
            name: '',
            avatar: '',
            distance: '距500m',
          };
          this.canCreateOrder = rawEvent.canCreateOrder ?? true;
          this.activeOrder = rawEvent.activeOrder || null;
          this.favoriteCount = rawEvent.FavoriteCount ?? 0;
          // 解析标签：优先从 EventTags 表取，兼容旧数据从 EventCategory 字段解析
          if (rawEvent.Tags) {
            this.eventTags = String(rawEvent.Tags).split(',').filter(Boolean);
          } else if (rawEvent.EventCategory) {
            this.eventTags = String(rawEvent.EventCategory)
              .split('、')
              .filter(Boolean);
          } else {
            this.eventTags = [];
          }
          // 主动向动态翻译服务注册并翻译标签，确保英文模式下能立刻显示译文
          setTimeout(
            () => this.dynTrans.translateAll(this.eventTags).subscribe(),
            100,
          );
          if (this.event?.creatorId) {
            this.loadUserFromStorage(this.event.creatorId);
          }
          this.checkUserIsCreator();
          this.checkFavoriteAndFollowStatus();

          // 触发动态文本翻译（管道已注册文本，此处批量调用API）
          setTimeout(() => this.dynTrans.translateAll().subscribe(), 200);
        }
      }
    } catch (error) {
      console.error('加载事件详情失败:', error);
    }
  }

  /** 点击标签跳转到 tab2 搜索相同标签的内容 */
  searchByTag(tag: string) {
    this.router.navigate(['/tabs/tab2'], {
      queryParams: { search: tag },
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
          this.userInfo.followerCount = data.user.FollowerCount ?? 0;
          this.userInfo.CreateTime = data.user.CreateTime || '';
        }
      }
    } catch (e) {
      console.error('loadUserFromStorage error', e);
    }
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

  goToUserParticular() {
    if (this.isCurrentUserCreator) {
      this.router.navigate(['/tabs/tab4']);
    } else if (this.userInfo.name) {
      this.navCtrl.navigateForward('/user-particular', {
        queryParams: {
          name: this.userInfo.name,
          userId: this.event?.creatorId,
        },
      });
    }
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

  openOrderModal() {
    if (!this.event) return;
    const currentUserId = this.authService.currentUserId;
    if (!currentUserId) {
      this.showToast(this.t.loginRequired);
      this.router.navigate(['/tabs/tab4'], {
        queryParams: { returnEventId: this.event?.id },
      });
      return;
    }
    if (!this.canCreateOrder) {
      this.showToast(this.t.orderInProgress);
      return;
    }
    // 预选事件地址为下单地址
    this.orderForm.reset({
      DetailLocation: this.event.address || '',
      SpecificLocation: '',
      AdditionalInfo: '',
    });
    this.pickedLocationDisplay = this.event.address || '';
    this.isOrderModalOpen = true;
  }

  async openOrderLocationPicker() {
    const modal = await this.modalCtrl.create({
      component: LocationPickerComponent,
      cssClass: 'location-picker-modal',
      componentProps: {
        selectedPlaceId: '',
        selectedText: this.orderForm.value.DetailLocation || '',
      },
    });
    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role !== 'confirm' || !data?.selected) return;

    const picked: PickedLocation = data.selected;
    this.orderForm.patchValue({ DetailLocation: picked.text });
    this.pickedLocationDisplay = picked.text;
  }

  closeOrderModal() {
    this.isOrderModalOpen = false;
  }

  async submitOrder() {
    if (!this.event || this.isSubmittingOrder) return;
    if (this.orderForm.invalid) {
      this.showToast(this.t.fillComplete);
      return;
    }

    this.isSubmittingOrder = true;
    const formValue = this.orderForm.value;
    try {
      const resp = await fetch(`${this.apiBase}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authService.getAuthHeader(),
        },
        body: JSON.stringify({
          EventId: this.event.id,
          DetailLocation: formValue.DetailLocation || this.event.address || '',
          SpecificLocation: formValue.SpecificLocation || '',
          AdditionalInfo: formValue.AdditionalInfo || '',
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success) {
        this.showToast(data?.error || this.t.orderFailed);
        return;
      }
      this.closeOrderModal();
      this.canCreateOrder = false;
      this.activeOrder = { OrderId: data.orderId, OrderStatus: 0 };
      this.showToast(this.t.orderSuccess);
    } catch (e) {
      console.error('submitOrder error', e);
      this.showToast(this.t.networkError);
    } finally {
      this.isSubmittingOrder = false;
    }
  }

  async onFollow() {
    const currentUserId = this.authService.currentUserId;
    if (!currentUserId) {
      this.showToast(this.t.loginRequired);
      this.router.navigate(['/tabs/tab4'], {
        queryParams: { returnEventId: this.event?.id },
      });
      return;
    }
    if (!this.event?.creatorId) return;
    const result = await this.authService.toggleFollow(this.event.creatorId);
    if (result !== null) {
      this.isFollowingCreator = result;
      this.userInfo.followerCount = Math.max(
        0,
        (this.userInfo.followerCount || 0) + (result ? 1 : -1),
      );
      this.showToast(result ? this.t.followed : this.t.unfollowed);
    }
  }

  async onCollect() {
    const currentUserId = this.authService.currentUserId;
    if (!currentUserId) {
      this.showToast(this.t.loginRequired);
      this.router.navigate(['/tabs/tab4'], {
        queryParams: { returnEventId: this.event?.id },
      });
      return;
    }
    if (!this.event?.id) return;
    const result = await this.authService.toggleFavorite(Number(this.event.id));
    if (result !== null) {
      this.isFavorited = result;
      this.favoriteCount = Math.max(0, this.favoriteCount + (result ? 1 : -1));
      this.showToast(result ? this.t.favorited : this.t.unfavorited);
    }
  }

  checkUserIsCreator() {
    const currentUserId = this.authService.currentUserId;
    const creatorId = this.event?.creatorId;
    this.isCurrentUserCreator =
      currentUserId != null && creatorId != null && currentUserId == creatorId;
  }

  async checkFavoriteAndFollowStatus() {
    const currentUserId = this.authService.currentUserId;
    if (!currentUserId || !this.event?.id) return;
    this.isFavorited = await this.authService.checkFavorite(
      Number(this.event.id),
    );
    if (!this.isCurrentUserCreator && this.event?.creatorId) {
      this.isFollowingCreator = await this.authService.checkFollow(
        this.event.creatorId,
      );
    }
  }

  async onChat() {
    const currentUserId = this.authService.currentUserId;
    if (!currentUserId) {
      this.showToast(this.t.loginRequired);
      this.router.navigate(['/tabs/tab4'], {
        queryParams: { returnEventId: this.event?.id },
      });
      return;
    }

    if (this.isCurrentUserCreator) {
      this.openEditModal();
      return;
    }

    const chatData = {
      eventId: this.event?.id,
      creatorId: currentUserId,
      partnerId: this.event?.creatorId,
    };
    const roomId = `${chatData.eventId}_${chatData.creatorId}_${chatData.partnerId}`;
    this.navCtrl.navigateForward(`/chat-detail/${roomId}`, {
      state: {
        roomId: roomId,
        eventId: this.event?.id,
      },
    });
  }

  async openEditModal() {
    if (!this.event?.id) return;

    try {
      const resp = await fetch(`${this.apiBase}/events/${this.event.id}`);
      const data = await resp.json();

      if (data?.success && data?.event) {
        const evt = data.event;
        this.editingEventData = {
          id: this.event.id,
          EventTitle: evt.EventTitle || '',
          EventType: evt.EventType ?? 0,
          EventCategory: evt.EventCategory || '',
          Location: evt.Location || '',
          LocationPlaceId: evt.LocationPlaceId || '',
          LocationLng: evt.LocationLng != null ? Number(evt.LocationLng) : null,
          LocationLat: evt.LocationLat != null ? Number(evt.LocationLat) : null,
          Price: evt.Price ?? 0,
          EventDetails: evt.EventDetails || '',
          Photos: evt.Photos || null,
        };
      }
    } catch (e) {
      console.error('加载事件数据失败', e);
    }

    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.editingEventData = null;
  }

  async onLocationPicker(): Promise<void> {
    const sharedModal = this.editEventModal;
    if (!sharedModal) return;

    const modal = await this.modalCtrl.create({
      component: LocationPickerComponent,
      componentProps: {
        selectedPlaceId: sharedModal.getFormValue('LocationPlaceId') || '',
        selectedText: sharedModal.getFormValue('Location') || '',
      },
    });
    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role !== 'confirm' || !data?.selected) return;

    const picked: PickedLocation = data.selected;
    sharedModal.patchForm({
      Location: picked.text,
      LocationPlaceId: picked.placeId,
      LocationLng: picked.lng,
      LocationLat: picked.lat,
    });
  }

  async submitEdit(payload: EditEventPayload): Promise<void> {
    if (!this.event?.id) return;
    if (this.isSavingEdit) return;

    this.isSavingEdit = true;
    const { formData, photosJson } = payload;

    try {
      const resp = await fetch(`${this.apiBase}/events/${this.event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authService.token}`,
        },
        body: JSON.stringify({ ...formData, Photos: photosJson }),
      });

      const data = await resp.json();

      if (data.success) {
        this.showToast(this.t.editSuccess);
        this.closeEditModal();
        this.loadEventDetail(String(this.event.id));
      } else {
        this.showToast(data.error || this.t.editFailed);
      }
    } catch (e) {
      console.error('提交修改失败', e);
      this.showToast(this.t.networkError);
    } finally {
      this.isSavingEdit = false;
    }
  }

  previewPhoto(photo: string): void {
    this.previewPhotoIndex = this.eventPhotos.indexOf(photo);
    this.previewImageUrl = photo.startsWith('http')
      ? photo
      : this.apiBase + photo;
  }

  closePreview(): void {
    this.previewImageUrl = null;
  }

  prevPhoto(): void {
    if (this.previewPhotoIndex > 0) {
      this.previewPhotoIndex--;
      const photo = this.eventPhotos[this.previewPhotoIndex];
      this.previewImageUrl = photo.startsWith('http')
        ? photo
        : this.apiBase + photo;
    }
  }

  nextPhoto(): void {
    if (this.previewPhotoIndex < this.eventPhotos.length - 1) {
      this.previewPhotoIndex++;
      const photo = this.eventPhotos[this.previewPhotoIndex];
      this.previewImageUrl = photo.startsWith('http')
        ? photo
        : this.apiBase + photo;
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      positionAnchor: 'particular-footer',
    });
    await toast.present();
  }
}
