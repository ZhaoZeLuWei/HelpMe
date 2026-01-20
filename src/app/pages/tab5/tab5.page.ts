import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
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
import { NavController, ToastController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  close,
  closeCircle,
  handLeftOutline,
  heartOutline,
  imageOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

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
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
  ],
})
export class Tab5Page implements OnInit {
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
  private toastCtrl = inject(ToastController);
  private auth = inject(AuthService);

  constructor() {
    addIcons({
      close,
      handLeftOutline,
      heartOutline,
      shieldCheckmarkOutline,
      imageOutline,
      addCircleOutline,
      closeCircle,
    });
  }

  ngOnInit(): void {
    this.requestForm = this.fb.group({
      EventTitle: ['', Validators.required],
      EventType: [0],
      EventCategory: ['', Validators.required],
      Location: ['', Validators.required],
      Price: [0, [Validators.min(0)]],
      EventDetails: ['', Validators.required],
    });

    this.helpForm = this.fb.group({
      EventTitle: ['', Validators.required],
      EventType: [1],
      EventCategory: ['', Validators.required],
      Location: ['', Validators.required],
      Price: [0, [Validators.required, Validators.min(0)]],
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
      ProviderRole: ['', [Validators.required, Validators.pattern(/^[123]$/)]],
      Introduction: [''],
    });
  }

  private async requireLogin(): Promise<number | null> {
    const uid = this.auth.currentUserId;
    if (uid) return uid;

    const t = await this.toastCtrl.create({
      message: '请先登录后再发布',
      duration: 2000,
      position: 'bottom',
    });
    await t.present();

    this.router.navigate(['/tabs/tab4']);
    return null;
  }

  private async postFormData(
    endpoint: string,
    fd: FormData,
  ): Promise<any | null> {
    const resp = await fetch(`${this.API_BASE}${endpoint}`, {
      method: 'POST',
      body: fd,
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.success) {
      const msg = data?.error || data?.msg || '请求失败';
      const t = await this.toastCtrl.create({
        message: msg,
        duration: 2500,
        position: 'bottom',
      });
      await t.present();
      return null;
    }

    return data;
  }

  private async uploadImages(files: File[]): Promise<string[]> {
    if (!files || files.length === 0) return [];

    const fd = new FormData();
    for (const f of files) fd.append('images', f);

    const resp = await fetch(`${this.API_BASE}/upload/images`, {
      method: 'POST',
      body: fd,
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.success) {
      throw new Error(data?.error || data?.msg || 'upload failed');
    }
    return data.paths as string[];
  }

  private async createEvent(payload: any): Promise<boolean> {
    try {
      const resp = await fetch(`${this.API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        const msg = data?.error || data?.msg || '发布失败';
        const t = await this.toastCtrl.create({
          message: msg,
          duration: 2500,
          position: 'bottom',
        });
        await t.present();
        return false;
      }

      const t = await this.toastCtrl.create({
        message: '发布成功',
        duration: 1800,
        position: 'bottom',
      });
      await t.present();
      return true;
    } catch (e) {
      console.error(e);
      const t = await this.toastCtrl.create({
        message: '网络错误，发布失败',
        duration: 2500,
        position: 'bottom',
      });
      await t.present();
      return false;
    }
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

    if (phone) {
      this.identityForm.patchValue({ PhoneNumber: phone });
    }

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

    if (photos.length >= max) return;
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
    if (!this.requestForm.valid) return;

    const uid = await this.requireLogin();
    if (!uid) return;

    const v: any = this.requestForm.value || {};
    const fd = new FormData();
    fd.append('CreatorId', String(uid));
    fd.append('EventTitle', String(v.EventTitle ?? ''));
    fd.append('EventType', String(v.EventType ?? 0));
    fd.append('EventCategory', String(v.EventCategory ?? ''));
    fd.append('Location', String(v.Location ?? ''));
    fd.append('Price', String(v.Price ?? 0));
    fd.append('EventDetails', String(v.EventDetails ?? ''));
    for (const f of this.requestFiles) fd.append('images', f);

    const data = await this.postFormData('/events', fd);
    if (!data) return;

    const t = await this.toastCtrl.create({
      message: '发布成功',
      duration: 1800,
      position: 'bottom',
    });
    await t.present();

    for (const u of this.requestPhotos) URL.revokeObjectURL(u);
    this.requestPhotos = [];
    this.requestFiles = [];
    this.requestForm.reset({
      EventTitle: '',
      EventType: 0,
      EventCategory: '',
      Location: '',
      Price: 0,
      EventDetails: '',
    });
    this.showRequestModal = false;
  }

  async submitHelp(): Promise<void> {
    if (!this.helpForm.valid) return;

    const uid = await this.requireLogin();
    if (!uid) return;

    const v: any = this.helpForm.value || {};
    const fd = new FormData();
    fd.append('CreatorId', String(uid));
    fd.append('EventTitle', String(v.EventTitle ?? ''));
    fd.append('EventType', String(v.EventType ?? 1));
    fd.append('EventCategory', String(v.EventCategory ?? ''));
    fd.append('Location', String(v.Location ?? ''));
    fd.append('Price', String(v.Price ?? 0));
    fd.append('EventDetails', String(v.EventDetails ?? ''));
    for (const f of this.helpFiles) fd.append('images', f);

    const data = await this.postFormData('/events', fd);
    if (!data) return;

    const t = await this.toastCtrl.create({
      message: '发布成功',
      duration: 1800,
      position: 'bottom',
    });
    await t.present();

    for (const u of this.helpPhotos) URL.revokeObjectURL(u);
    this.helpPhotos = [];
    this.helpFiles = [];
    this.helpForm.reset({
      EventTitle: '',
      EventType: 1,
      EventCategory: '',
      Location: '',
      Price: 0,
      EventDetails: '',
    });
    this.showHelpModal = false;
  }

  async submitIdentity(): Promise<void> {
    if (!this.identityForm.valid) return;

    const uid = await this.requireLogin();
    if (!uid) return;

    // PhoneNumber 是 disabled：identityForm.value 里不会包含手机号；也不需要发送给后端
    const v: any = this.identityForm.getRawValue();

    const fd = new FormData();
    fd.append('ProviderId', String(uid));
    fd.append('ServiceCategory', String(v.ProviderRole ?? ''));
    fd.append('RealName', String(v.RealName ?? ''));
    fd.append('IdCardNumber', String(v.IdCardNumber ?? ''));
    fd.append('Location', String(v.Location ?? ''));
    if (v.Introduction != null && String(v.Introduction).trim() !== '') {
      fd.append('Introduction', String(v.Introduction));
    }

    for (const f of this.idCardFiles) fd.append('idCard', f);
    for (const f of this.certFiles) fd.append('cert', f);

    const data = await this.postFormData('/verifications', fd);
    if (!data) return;

    const t = await this.toastCtrl.create({
      message: '认证提交成功，等待审核',
      duration: 1800,
      position: 'bottom',
    });
    await t.present();

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
      ProviderRole: '',
      Introduction: '',
    });

    this.showIdentityModal = false;
  }

  closeGuide(): void {
    if (window.history.length > 1) {
      this.navCtrl.back();
    } else {
      this.router.navigate(['/tabs/tab1']);
    }
  }
}
