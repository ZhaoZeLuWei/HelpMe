import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
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
import { Router } from '@angular/router';
import {
  NavController,
  ToastController,
  AlertController,
} from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonText,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  addCircleOutline,
  close,
  closeCircle,
  globeOutline,
  handLeftOutline,
  heartOutline,
  imageOutline,
  locationOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { AiService } from '../../services/ai.service';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../services/language.service';
import {
  LocationPickerComponent,
  type PickedLocation,
} from '../../components/location-picker/location-picker.component';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab5',
  templateUrl: 'tab5.page.html',
  styleUrls: ['tab5.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonText,
    IonModal,
  ],
})
export class Tab5Page implements OnInit, OnDestroy {
  showRequestModal = false;
  showHelpModal = false;
  showIdentityModal = false;

  private readonly API_BASE = environment.apiBase;

  // 预览用（ObjectURL），不会入库
  requestPhotos: string[] = [];
  helpPhotos: string[] = [];
  idCardPhotos: string[] = [];
  certPhotos: string[] = [];

  // 真正上传用（File）
  requestFiles: File[] = [];
  helpFiles: File[] = [];
  idCardFiles: File[] = [];
  certFiles: File[] = [];

  requestForm!: FormGroup;
  helpForm!: FormGroup;
  identityForm!: FormGroup;

  // 提交中状态：只有提交中才禁用按钮
  isSubmittingRequest = false;
  isSubmittingHelp = false;
  isSubmittingIdentity = false;

  // ---- AI 辅助状态 ----
  isAiGenerating = false;
  aiTags: string[] = [];

  @ViewChild('requestFileInput')
  requestFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('helpFileInput') helpFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('idCardFileInput') idCardFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('certFileInput') certFileInput!: ElementRef<HTMLInputElement>;

  readonly REQUEST_MAX = 5;
  readonly HELP_MAX = 5;
  readonly IDCARD_MAX = 2;
  readonly CERT_MAX = 5;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private auth = inject(AuthService);
  private aiService = inject(AiService);
  private langService = inject(LanguageService);
  private langSub: Subscription | null = null;

  // 翻译对象
  t = this.langService.getTranslations('zh').tab5;

  constructor() {
    addIcons({
      add,
      close,
      locationOutline,
      globeOutline,
      handLeftOutline,
      heartOutline,
      shieldCheckmarkOutline,
      imageOutline,
      addCircleOutline,
      closeCircle,
      sparklesOutline,
    });

    //监听语言变化
    this.langSub = this.langService.currentLang$.subscribe(
      (lang: 'zh' | 'en') => {
        this.t = this.langService.getTranslations(lang).tab5;
      },
    );
  }

  ngOnDestroy(): void {
    if (this.langSub) {
      this.langSub.unsubscribe();
      this.langSub = null;
    }
  }

  ngOnInit(): void {
    this.requestForm = this.fb.group({
      EventTitle: ['', Validators.required],
      EventType: [0],
      EventCategory: [''],
      isOnlineService: [false],
      Location: ['', Validators.required],
      LocationPlaceId: [''],
      LocationLng: [null],
      LocationLat: [null],
      Price: [0, [Validators.min(0), Validators.max(1_000_000)]],
      EventDetails: ['', Validators.required],
    });

    this.helpForm = this.fb.group({
      EventTitle: ['', Validators.required],
      EventType: [1],
      EventCategory: [''],
      isOnlineService: [false],
      Location: ['', Validators.required],
      LocationPlaceId: [''],
      LocationLng: [null],
      LocationLat: [null],
      Price: [
        0,
        [Validators.required, Validators.min(0), Validators.max(1_000_000)],
      ],
      EventDetails: ['', Validators.required],
    });

    this.identityForm = this.fb.group({
      RealName: ['', Validators.required],
      PhoneNumber: this.fb.control({ value: '', disabled: true }),
      IdCardNumber: [
        '',
        [Validators.required, Validators.pattern(/^(\d{18}|\d{17}[\dXx])$/)],
      ],
      Location: ['', Validators.required],
      LocationPlaceId: [''],
      LocationLng: [null],
      LocationLat: [null],
      ProviderRole: ['', [Validators.required, Validators.pattern(/^[123]$/)]],
      Introduction: [''],
    });
  }

  private appendLocationMeta(fd: FormData, value: any) {
    if (value?.LocationPlaceId) {
      fd.append('LocationPlaceId', String(value.LocationPlaceId));
    }

    if (value?.LocationLng !== null && value?.LocationLng !== undefined) {
      fd.append('LocationLng', String(value.LocationLng));
    }

    if (value?.LocationLat !== null && value?.LocationLat !== undefined) {
      fd.append('LocationLat', String(value.LocationLat));
    }
  }

  async openLocationPicker(formType: 'request' | 'help' | 'identity') {
    const form =
      formType === 'request'
        ? this.requestForm
        : formType === 'help'
          ? this.helpForm
          : this.identityForm;

    const modal = await this.modalCtrl.create({
      component: LocationPickerComponent,
      cssClass: 'location-picker-modal',
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

  /** 切换线上服务模式 */
  toggleOnlineService(formType: 'request' | 'help') {
    const form = formType === 'request' ? this.requestForm : this.helpForm;
    const current = form.get('isOnlineService')?.value ?? false;
    const newVal = !current;
    form.patchValue({ isOnlineService: newVal });

    const locCtrl = form.get('Location');
    if (newVal) {
      // 开启线上服务：清除位置，移除必填验证
      locCtrl?.clearValidators();
      form.patchValue({
        Location: '',
        LocationPlaceId: '',
        LocationLng: null,
        LocationLat: null,
      });
    } else {
      // 关闭线上服务：恢复必填验证
      locCtrl?.setValidators(Validators.required);
    }
    locCtrl?.updateValueAndValidity();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({
      message,
      duration: 750,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
    });
    await t.present();
  }

  // ==================== AI 智能填表 ====================

  /** 用户输关键词 → AI 自动填标题、标签、详细描述 */
  async aiFillForm(formType: 'request' | 'help') {
    const form = formType === 'request' ? this.requestForm : this.helpForm;
    const input = form.get('EventTitle')?.value?.trim();
    const existingDetails = form.get('EventDetails')?.value?.trim();

    if (!input || input.length < 2) {
      await this.toast(this.t.aiKeywordHint);
      return;
    }

    // 如果详细描述已有内容，确认是否覆盖
    if (existingDetails) {
      const alert = await this.alertCtrl.create({
        header: this.t.aiConfirmOverwrite,
        message: this.t.aiConfirmOverwriteMsg,
        buttons: [
          { text: this.t.aiCancel, role: 'cancel' },
          { text: this.t.aiConfirmOverwriteBtn, role: 'destructive' },
        ],
      });
      await alert.present();
      const { role } = await alert.onWillDismiss();
      if (role !== 'destructive') return;
    }

    this.isAiGenerating = true;
    try {
      const result = await this.aiService.fillForm(input, formType);
      if (result) {
        this.aiTags = result.tags || [];
        form.patchValue({
          EventTitle: result.title,
          EventCategory: this.aiTags.join('、'),
          EventDetails: result.details,
        });
      } else {
        await this.toast(this.t.aiFailed);
      }
    } catch {
      await this.toast(this.t.aiFailed);
    } finally {
      this.isAiGenerating = false;
    }
  }

  /** 手动添加自定义标签 */
  async addManualTag(formType: 'request' | 'help') {
    const alert = await this.alertCtrl.create({
      header: this.t.addTagTitle,
      inputs: [
        { name: 'tag', type: 'text', placeholder: this.t.addTagPlaceholder },
      ],
      buttons: [
        { text: this.t.aiCancel, role: 'cancel' },
        {
          text: this.t.addTagBtn,
          handler: (data) => {
            const tag = data.tag?.trim();
            if (!tag || tag.length < 1) {
              this.toast(this.t.tagRequired);
              return false;
            }
            if (tag.length > 10) {
              this.toast(this.t.tagTooLong);
              return false;
            }
            this.aiTags.push(tag);
            const form =
              formType === 'request' ? this.requestForm : this.helpForm;
            form.patchValue({ EventCategory: this.aiTags.join('、') });
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  /** 移除某个标签，同时更新类别栏 */
  removeAiTag(formType: 'request' | 'help', index: number) {
    this.aiTags.splice(index, 1);
    const form = formType === 'request' ? this.requestForm : this.helpForm;
    form.patchValue({ EventCategory: this.aiTags.join('、') });
  }

  private collectInvalidMessages(
    formType: 'request' | 'help' | 'identity',
  ): string[] {
    const msgs: string[] = [];

    if (formType === 'request') {
      const f = this.requestForm;
      if (f.get('EventTitle')?.invalid) msgs.push(this.t.titleRequired);
      if (this.aiTags.length === 0 && !f.get('EventCategory')?.value?.trim())
        msgs.push(this.t.tagsRequired);
      if (f.get('Location')?.invalid && !f.get('isOnlineService')?.value)
        msgs.push(this.t.locationRequired);
      if (f.get('EventDetails')?.invalid) msgs.push(this.t.detailsRequired);
      if (f.get('Price')?.invalid) msgs.push(this.t.priceInvalid);
    }

    if (formType === 'help') {
      const f = this.helpForm;
      if (f.get('EventTitle')?.invalid) msgs.push(this.t.titleRequired);
      if (this.aiTags.length === 0 && !f.get('EventCategory')?.value?.trim())
        msgs.push(this.t.tagsRequired);
      if (f.get('Location')?.invalid && !f.get('isOnlineService')?.value)
        msgs.push(this.t.serviceLocationRequired);
      if (f.get('EventDetails')?.invalid)
        msgs.push(this.t.serviceDetailsRequired);
      if (f.get('Price')?.invalid) msgs.push(this.t.servicePriceInvalid);
    }

    if (formType === 'identity') {
      const f = this.identityForm;
      if (f.get('RealName')?.invalid) msgs.push(this.t.realNameRequired);
      if (f.get('IdCardNumber')?.invalid) msgs.push(this.t.idCardRequired);
      if (f.get('Location')?.invalid) msgs.push(this.t.areaRequired);
      if (f.get('ProviderRole')?.invalid) msgs.push(this.t.roleRequired);

      if (this.idCardFiles.length === 0) msgs.push(this.t.uploadIdCardRequired);
      if (this.certFiles.length === 0) msgs.push(this.t.uploadCertRequired);
    }

    return msgs;
  }

  private async showFormErrors(formType: 'request' | 'help' | 'identity') {
    const form =
      formType === 'request'
        ? this.requestForm
        : formType === 'help'
          ? this.helpForm
          : this.identityForm;

    form.markAllAsTouched();

    const msgs = this.collectInvalidMessages(formType);
    if (msgs.length === 0) {
      await this.toast(this.t.completeRequired);
      return;
    }

    await this.toast(`${this.t.completeRequired}：${msgs.join('、')}`);
  }

  private async requireLogin(): Promise<number | null> {
    const uid = this.auth.currentUserId;
    if (uid) return uid;

    await this.toast(this.t.loginRequired);
    this.router.navigate(['/tabs/tab4']);
    return null;
  }

  private async postFormData(
    endpoint: string,
    fd: FormData,
  ): Promise<any | null> {
    const resp = await fetch(`${this.API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        ...this.auth.getAuthHeader(), // JWT
      },
      body: fd,
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data?.success) {
      if (resp.status === 401) {
        await this.auth.handleAuthExpired();
        return null;
      }
      if (resp.status === 404) {
        await this.toast(this.t.apiNotFound + ` (${endpoint})`);
        return null;
      }

      const msg = data?.error || data?.msg || this.t.requestFailed;
      await this.toast(String(msg));
      return null;
    }

    return data;
  }

  async navigateToRequest(): Promise<void> {
    const uid = await this.requireLogin();
    if (!uid) return;
    this.showRequestModal = true;
  }

  async navigateToSupport(): Promise<void> {
    const uid = await this.requireLogin();
    if (!uid) return;
    this.showHelpModal = true;
  }

  async navigateToIdentitySelection(): Promise<void> {
    const uid = await this.requireLogin();
    if (!uid) return;

    // 手机号是登录账号：自动读取并禁用编辑
    const authAny: any = this.auth as any;
    const phone: string | null =
      authAny?.currentPhoneNumber ??
      authAny?.currentUser?.PhoneNumber ??
      authAny?.currentUser?.phoneNumber ??
      authAny?.user?.PhoneNumber ??
      authAny?.user?.phoneNumber ??
      null;

    if (phone) this.identityForm.patchValue({ PhoneNumber: phone });

    this.showIdentityModal = true;
  }

  triggerFileInput(type: 'request' | 'help' | 'idcard' | 'cert'): void {
    let photos: string[] = [];
    let max = 5;
    let input: ElementRef<HTMLInputElement>;

    if (type === 'request') {
      photos = this.requestPhotos;
      max = this.REQUEST_MAX;
      input = this.requestFileInput;
    } else if (type === 'help') {
      photos = this.helpPhotos;
      max = this.HELP_MAX;
      input = this.helpFileInput;
    } else if (type === 'idcard') {
      photos = this.idCardPhotos;
      max = this.IDCARD_MAX;
      input = this.idCardFileInput;
    } else {
      photos = this.certPhotos;
      max = this.CERT_MAX;
      input = this.certFileInput;
    }

    if (photos.length >= max) {
      void this.toast(this.t.maxPhotos.replace('{max}', String(max)));
      return;
    }

    input?.nativeElement.click();
  }

  onFileSelected(
    event: Event,
    type: 'request' | 'help' | 'idcard' | 'cert',
  ): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    let photos: string[] = [];
    let fileList: File[] = [];
    let max = 5;

    if (type === 'request') {
      photos = this.requestPhotos;
      fileList = this.requestFiles;
      max = this.REQUEST_MAX;
    } else if (type === 'help') {
      photos = this.helpPhotos;
      fileList = this.helpFiles;
      max = this.HELP_MAX;
    } else if (type === 'idcard') {
      photos = this.idCardPhotos;
      fileList = this.idCardFiles;
      max = this.IDCARD_MAX;
    } else {
      photos = this.certPhotos;
      fileList = this.certFiles;
      max = this.CERT_MAX;
    }

    const remaining = max - photos.length;
    const pick = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, remaining);

    for (const f of pick) {
      fileList.push(f);
      photos.push(URL.createObjectURL(f)); // 仅预览，不入库
    }

    input.value = '';
  }

  removePhoto(
    index: number,
    type: 'request' | 'help' | 'idcard' | 'cert',
  ): void {
    if (type === 'request') {
      URL.revokeObjectURL(this.requestPhotos[index]);
      this.requestPhotos.splice(index, 1);
      this.requestFiles.splice(index, 1);
    } else if (type === 'help') {
      URL.revokeObjectURL(this.helpPhotos[index]);
      this.helpPhotos.splice(index, 1);
      this.helpFiles.splice(index, 1);
    } else if (type === 'idcard') {
      URL.revokeObjectURL(this.idCardPhotos[index]);
      this.idCardPhotos.splice(index, 1);
      this.idCardFiles.splice(index, 1);
    } else {
      URL.revokeObjectURL(this.certPhotos[index]);
      this.certPhotos.splice(index, 1);
      this.certFiles.splice(index, 1);
    }
  }

  async submitRequest(): Promise<void> {
    if (this.isSubmittingRequest) return;

    if (!this.requestForm.valid) {
      await this.showFormErrors('request');
      return;
    }

    const uid = await this.requireLogin();
    if (!uid) return;

    this.isSubmittingRequest = true;
    try {
      const v: any = this.requestForm.value || {};
      const fd = new FormData();

      // JWT 化后不再传 CreatorId（后端从 token 取）
      fd.append('EventTitle', String(v.EventTitle ?? ''));
      fd.append('EventType', String(v.EventType ?? 0));
      fd.append(
        'EventCategory',
        this.aiTags.length > 0
          ? this.aiTags.join('、')
          : String(v.EventCategory ?? ''),
      );
      const location = v.isOnlineService ? '线上服务' : (v.Location ?? '');
      fd.append('Location', String(location));
      if (!v.isOnlineService) this.appendLocationMeta(fd, v);
      fd.append('Price', String(v.Price ?? 0));
      fd.append('EventDetails', String(v.EventDetails ?? ''));

      for (const f of this.requestFiles) fd.append('images', f);

      const data = await this.postFormData('/events', fd);
      if (!data) return;

      await this.toast(this.t.publishSuccess);

      for (const u of this.requestPhotos) URL.revokeObjectURL(u);
      this.requestPhotos = [];
      this.requestFiles = [];
      this.aiTags = [];
      this.requestForm.reset({
        EventTitle: '',
        EventType: 0,
        EventCategory: '',
        isOnlineService: false,
        Location: '',
        LocationPlaceId: '',
        LocationLng: null,
        LocationLat: null,
        Price: '',
        EventDetails: '',
      });
      this.showRequestModal = false;
    } finally {
      this.isSubmittingRequest = false;
    }
  }

  async submitHelp(): Promise<void> {
    if (this.isSubmittingHelp) return;

    if (!this.helpForm.valid) {
      await this.showFormErrors('help');
      return;
    }

    const uid = await this.requireLogin();
    if (!uid) return;

    this.isSubmittingHelp = true;
    try {
      const v: any = this.helpForm.value || {};
      const fd = new FormData();

      // JWT 化后不再传 CreatorId（后端从 token 取）
      fd.append('EventTitle', String(v.EventTitle ?? ''));
      fd.append('EventType', String(v.EventType ?? 1));
      fd.append(
        'EventCategory',
        this.aiTags.length > 0
          ? this.aiTags.join('、')
          : String(v.EventCategory ?? ''),
      );
      const location = v.isOnlineService ? '线上服务' : (v.Location ?? '');
      fd.append('Location', String(location));
      if (!v.isOnlineService) this.appendLocationMeta(fd, v);
      fd.append('Price', String(v.Price ?? 0));
      fd.append('EventDetails', String(v.EventDetails ?? ''));

      for (const f of this.helpFiles) fd.append('images', f);

      const data = await this.postFormData('/events', fd);
      if (!data) return;

      await this.toast(this.t.publishSuccess);

      for (const u of this.helpPhotos) URL.revokeObjectURL(u);
      this.helpPhotos = [];
      this.helpFiles = [];
      this.aiTags = [];
      this.helpForm.reset({
        EventTitle: '',
        EventType: 1,
        EventCategory: '',
        isOnlineService: false,
        Location: '',
        LocationPlaceId: '',
        LocationLng: null,
        LocationLat: null,
        Price: 0,
        EventDetails: '',
      });
      this.showHelpModal = false;
    } finally {
      this.isSubmittingHelp = false;
    }
  }

  async submitIdentity(): Promise<void> {
    if (this.isSubmittingIdentity) return;

    const msgs = this.collectInvalidMessages('identity');
    if (msgs.length > 0) {
      await this.showFormErrors('identity');
      return;
    }

    const uid = await this.requireLogin();
    if (!uid) return;

    this.isSubmittingIdentity = true;
    try {
      const v: any = this.identityForm.getRawValue();
      const fd = new FormData();

      // JWT 化后不再传 ProviderId（后端从 token 取）
      fd.append('ServiceCategory', String(v.ProviderRole ?? ''));
      fd.append('RealName', String(v.RealName ?? ''));
      fd.append('IdCardNumber', String(v.IdCardNumber ?? ''));
      fd.append('Location', String(v.Location ?? ''));
      this.appendLocationMeta(fd, v);

      if (v.Introduction != null && String(v.Introduction).trim() !== '') {
        fd.append('Introduction', String(v.Introduction));
      }

      for (const f of this.idCardFiles) fd.append('idCard', f);
      for (const f of this.certFiles) fd.append('cert', f);

      const data = await this.postFormData('/verifications', fd);
      if (!data) return;

      await this.toast(this.t.verifySubmitSuccess);

      for (const u of this.idCardPhotos) URL.revokeObjectURL(u);
      for (const u of this.certPhotos) URL.revokeObjectURL(u);
      this.idCardPhotos = [];
      this.idCardFiles = [];
      this.certPhotos = [];
      this.certFiles = [];

      // reset 后再把手机号补回去（保持不可编辑）
      const authAny: any = this.auth as any;
      const phone: string | null =
        authAny?.currentPhoneNumber ??
        authAny?.currentUser?.PhoneNumber ??
        authAny?.currentUser?.phoneNumber ??
        authAny?.user?.PhoneNumber ??
        authAny?.user?.phoneNumber ??
        null;

      this.identityForm.reset({
        RealName: '',
        PhoneNumber: phone ?? '',
        IdCardNumber: '',
        Location: '',
        LocationPlaceId: '',
        LocationLng: null,
        LocationLat: null,
        ProviderRole: '',
        Introduction: '',
      });

      this.showIdentityModal = false;
    } finally {
      this.isSubmittingIdentity = false;
    }
  }

  closeGuide(): void {
    if (window.history.length > 1) {
      this.navCtrl.back();
    } else {
      this.router.navigate(['/tabs/tab1']);
    }
  }
}
