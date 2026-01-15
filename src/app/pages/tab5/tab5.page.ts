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
  readonly IDCARD_MAX = 1;
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
      PhoneNumber: [
        '',
        [Validators.required, Validators.pattern(/^1[3-9]\d{9}$/)],
      ],
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

  private async uploadImages(files: File[]): Promise<string[]> {
    if (!files || files.length === 0) return [];

    const fd = new FormData();
    for (const f of files) fd.append('images', f);

    const resp = await fetch('http://localhost:3000/upload/images', {
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
      const resp = await fetch('http://localhost:3000/events', {
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

    // 1) 上传图片拿路径
    let paths: string[] = [];
    try {
      paths = await this.uploadImages(this.requestFiles);
    } catch (e) {
      console.error(e);
      const t = await this.toastCtrl.create({
        message: '图片上传失败',
        duration: 2000,
        position: 'bottom',
      });
      await t.present();
      return;
    }

    // 2) 发布只存路径
    const data: any = { ...this.requestForm.value };
    data.CreatorId = uid;
    data.Photos = paths.length > 0 ? JSON.stringify(paths) : null;

    const ok = await this.createEvent(data);
    if (!ok) return;

    // 清理预览 URL
    for (const u of this.requestPhotos) URL.revokeObjectURL(u);
    this.requestPhotos = [];
    this.requestFiles = [];
    this.showRequestModal = false;
  }

  async submitHelp(): Promise<void> {
    if (!this.helpForm.valid) return;

    const uid = await this.requireLogin();
    if (!uid) return;

    let paths: string[] = [];
    try {
      paths = await this.uploadImages(this.helpFiles);
    } catch (e) {
      console.error(e);
      const t = await this.toastCtrl.create({
        message: '图片上传失败',
        duration: 2000,
        position: 'bottom',
      });
      await t.present();
      return;
    }

    const data: any = { ...this.helpForm.value };
    data.CreatorId = uid;
    data.Photos = paths.length > 0 ? JSON.stringify(paths) : null;

    const ok = await this.createEvent(data);
    if (!ok) return;

    for (const u of this.helpPhotos) URL.revokeObjectURL(u);
    this.helpPhotos = [];
    this.helpFiles = [];
    this.showHelpModal = false;
  }

  // 认证提交流程      后端还没写（Verifications 插入等）
  submitIdentity(): void {
    if (this.identityForm.valid) {
      const data = { ...this.identityForm.value };
      data.ProviderRole = Number(data.ProviderRole);
      console.log('提交认证(待后端接口):', data);
      this.showIdentityModal = false;
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
