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
import { NavController, ToastController, AlertController } from '@ionic/angular';
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
      await this.toast('请先在标题中输入需求关键词（至少2个字）');
      return;
    }

    // 如果详细描述已有内容，确认是否覆盖
    if (existingDetails) {
      const alert = await this.alertCtrl.create({
        header: '确认覆盖？',
        message: 'AI 将重新生成详细描述，覆盖已填写的内容。',
        buttons: [
          { text: '取消', role: 'cancel' },
          { text: '确认覆盖', role: 'destructive' },
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
        await this.toast('AI 填表失败，请稍后重试');
      }
    } catch {
      await this.toast('AI 填表失败，请稍后重试');
    } finally {
      this.isAiGenerating = false;
    }
  }

  /** 手动添加自定义标签 */
  async addManualTag(formType: 'request' | 'help') {
    const alert = await this.alertCtrl.create({
      header: '添加标签',
      inputs: [
        { name: 'tag', type: 'text', placeholder: '输入标签名称，如：紧急' },
      ],
      buttons: [
        { text: '取消', role: 'cancel' },
        {
          text: '添加',
          handler: (data) => {
            const tag = data.tag?.trim();
            if (!tag || tag.length < 1) {
              this.toast('请输入标签名称');
              return false;
            }
            if (tag.length > 10) {
              this.toast('标签最多10个字');
              return false;
            }
            this.aiTags.push(tag);
            const form = formType === 'request' ? this.requestForm : this.helpForm;
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
      if (f.get('EventTitle')?.invalid) msgs.push('标题必填');
      if (this.aiTags.length === 0 && !f.get('EventCategory')?.value?.trim()) msgs.push('标签必填，请使用智能填表生成');
      if (f.get('Location')?.invalid) msgs.push('位置必填');
      if (f.get('EventDetails')?.invalid) msgs.push('详细描述必填');
      if (f.get('Price')?.invalid)
        msgs.push('期望价格必填且必须在 0 ~ 1000000 之间');
    }

    if (formType === 'help') {
      const f = this.helpForm;
      if (f.get('EventTitle')?.invalid) msgs.push('标题必填');
      if (this.aiTags.length === 0 && !f.get('EventCategory')?.value?.trim()) msgs.push('标签必填，请使用智能填表生成');
      if (f.get('Location')?.invalid) msgs.push('服务区域必填');
      if (f.get('EventDetails')?.invalid) msgs.push('服务详情必填');
      if (f.get('Price')?.invalid)
        msgs.push('服务价格必填且必须在 0 ~ 1000000 之间');
    }

    if (formType === 'identity') {
      const f = this.identityForm;
      if (f.get('RealName')?.invalid) msgs.push('真实姓名必填');
      if (f.get('IdCardNumber')?.invalid)
        msgs.push('身份证号必填且格式正确（18位，末位可为X）');
      if (f.get('Location')?.invalid) msgs.push('所在区域必填');
      if (f.get('ProviderRole')?.invalid)
        msgs.push('身份类型必填（请选择热心群众、专业人士或商家）');

      if (this.idCardFiles.length === 0)
        msgs.push('请上传身份证照片（正反面）');
      if (this.certFiles.length === 0) msgs.push('请上传职业证书照片');
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
      await this.toast('请完善必填项后再提交');
      return;
    }

    await this.toast(`请先完善：${msgs.join('、')}`);
  }

  private async requireLogin(): Promise<number | null> {
    const uid = this.auth.currentUserId;
    if (uid) return uid;

    await this.toast('请先登录后再发布');
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
        await this.toast(`接口不存在（404）：${endpoint}`);
        return null;
      }

      const msg = data?.error || data?.msg || '请求失败';
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
      void this.toast(`最多只能上传 ${max} 张图片`);
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
      fd.append('EventCategory', this.aiTags.length > 0 ? this.aiTags.join('、') : String(v.EventCategory ?? ''));
      fd.append('Location', String(v.Location ?? ''));
      this.appendLocationMeta(fd, v);
      fd.append('Price', String(v.Price ?? 0));
      fd.append('EventDetails', String(v.EventDetails ?? ''));

      for (const f of this.requestFiles) fd.append('images', f);

      const data = await this.postFormData('/events', fd);
      if (!data) return;

      await this.toast('发布成功');

      for (const u of this.requestPhotos) URL.revokeObjectURL(u);
      this.requestPhotos = [];
      this.requestFiles = [];
      this.aiTags = [];
      this.requestForm.reset({
        EventTitle: '',
        EventType: 0,
        EventCategory: '',
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
      fd.append('EventCategory', this.aiTags.length > 0 ? this.aiTags.join('、') : String(v.EventCategory ?? ''));
      fd.append('Location', String(v.Location ?? ''));
      this.appendLocationMeta(fd, v);
      fd.append('Price', String(v.Price ?? 0));
      fd.append('EventDetails', String(v.EventDetails ?? ''));

      for (const f of this.helpFiles) fd.append('images', f);

      const data = await this.postFormData('/events', fd);
      if (!data) return;

      await this.toast('发布成功');

      for (const u of this.helpPhotos) URL.revokeObjectURL(u);
      this.helpPhotos = [];
      this.helpFiles = [];
      this.aiTags = [];
      this.helpForm.reset({
        EventTitle: '',
        EventType: 1,
        EventCategory: '',
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

      await this.toast('认证提交成功，等待审核');

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
