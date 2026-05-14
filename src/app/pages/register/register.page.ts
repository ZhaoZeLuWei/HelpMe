import {
  Component,
  signal,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { environment } from '../../../environments/environment';
import { LocationPickerComponent } from '../../components/location-picker/location-picker.component';
import { AliyunCaptchaService } from '../../services/aliyun-captcha.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
})
export class RegisterPage {
  private auth = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);
  private languageService = inject(LanguageService);
  private captchaService = inject(AliyunCaptchaService);

  t = this.languageService.getTranslations('zh').register;

  constructor() {
    this.languageService.currentLang$.subscribe((lang) => {
      this.t = this.languageService.getTranslations(lang).register;
    });
  }

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  // 两步注册流程
  step = signal<'verify' | 'info'>('verify');

  // 验证手机号表单
  verifyForm = new FormGroup({
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{11}$/),
    ]),
    code: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{4}$/),
    ]),
  });

  // 用户信息表单
  infoForm = new FormGroup({
    userName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(20),
    ]),
    realName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(20),
    ]),
    idCardNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/,
      ),
    ]),
    location: new FormControl('', [Validators.required]),
    locationPlaceId: new FormControl(''),
    birthDate: new FormControl('', [Validators.required]),
    introduction: new FormControl('', [Validators.maxLength(200)]),
  });

  // 头像相关
  avatarFile: File | null = null;
  avatarPreview: string | null = null;
  defaultAvatar = 'assets/icon/user.svg';

  sending = signal(false);
  sendCooldown = signal(0); // 秒
  registering = signal(false);

  async sendCode() {
    if (this.verifyForm.controls.phone.invalid) {
      const t = await this.toastCtrl.create({
        message: this.t.invalidPhone,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    if (this.sendCooldown() > 0) return;

    // 先检查手机号是否已注册
    const phone = this.verifyForm.controls.phone.value || '';
    this.sending.set(true);
    try {
      const resp = await fetch(`${this.auth['API_BASE']}/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        this.sending.set(false);
        const t = await this.toastCtrl.create({
          message: data?.error || this.t.phoneCheckFailed,
          duration: 2000,
          position: 'bottom',
          positionAnchor: 'main-tab-bar',
        });
        await t.present();
        return;
      }

      if (data.exists) {
        this.sending.set(false);
        const t = await this.toastCtrl.create({
          message: this.t.phoneExists,
          duration: 2000,
          position: 'bottom',
          positionAnchor: 'main-tab-bar',
        });
        await t.present();
        return;
      }
    } catch (err) {
      console.error('Check phone error:', err);
      this.sending.set(false);
      const t = await this.toastCtrl.create({
        message: this.t.networkError,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    let captchaData = null;
    try {
      captchaData = await this.captchaService.getValidate();
    } catch (err) {
      this.sending.set(false);
      const toast = await this.toastCtrl.create({
        message: err instanceof Error ? err.message : this.t.captchaLoadFailed,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await toast.present();
      return;
    }

    const sendResult = await this.auth.sendVerificationCode(phone, captchaData);
    if (!sendResult?.success) {
      this.sending.set(false);
      const toast = await this.toastCtrl.create({
        message: sendResult?.error || this.t.codeSendFailed,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await toast.present();
      return;
    }

    const toast = await this.toastCtrl.create({
      message: sendResult.message || this.t.codeSent,
      duration: 2000,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
    });
    await toast.present();

    this.sendCooldown.set(60);
    const timer = setInterval(() => {
      const next = this.sendCooldown() - 1;
      this.sendCooldown.set(next);
      if (next <= 0) {
        clearInterval(timer);
        this.sending.set(false);
      }
    }, 1000);
  }

  async nextStep() {
    if (this.verifyForm.invalid) {
      const t = await this.toastCtrl.create({
        message: this.t.formIncomplete,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    const phone = this.verifyForm.controls.phone.value || '';
    const code = this.verifyForm.controls.code.value || '';
    const verifyResult = await this.auth.verifyVerificationCode(phone, code);
    if (!verifyResult?.success) {
      const t = await this.toastCtrl.create({
        message: verifyResult?.error || this.t.codeError,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    // 进入下一步
    this.step.set('info');
  }

  backToVerify() {
    this.step.set('verify');
  }

  triggerAvatarPicker() {
    this.avatarInput?.nativeElement?.click();
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      const t = await this.toastCtrl.create({
        message: this.t.selectImage,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    // 验证文件大小（限制5MB）
    if (file.size > 5 * 1024 * 1024) {
      const t = await this.toastCtrl.create({
        message: this.t.imageTooLarge,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    this.avatarFile = file;

    // 生成预览
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeAvatar() {
    this.avatarFile = null;
    this.avatarPreview = null;
    if (this.avatarInput?.nativeElement) {
      this.avatarInput.nativeElement.value = '';
    }
  }

  async submit() {
    if (this.infoForm.invalid) {
      let message = this.t.formRequired;
      if (this.infoForm.controls.userName.invalid)
        message = this.t.userNameInvalid;
      else if (this.infoForm.controls.realName.invalid)
        message = this.t.realNameInvalid;
      else if (this.infoForm.controls.idCardNumber.invalid)
        message = this.t.idCardInvalid;
      else if (this.infoForm.controls.location.invalid)
        message = this.t.locationInvalid;
      else if (this.infoForm.controls.birthDate.invalid)
        message = this.t.birthDateInvalid;

      const t = await this.toastCtrl.create({
        message,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    this.registering.set(true);

    const phone = this.verifyForm.controls.phone.value || '';
    const code = this.verifyForm.controls.code.value || '';
    const userName = this.infoForm.controls.userName.value || '';
    const realName = this.infoForm.controls.realName.value || '';
    const idCardNumber = this.infoForm.controls.idCardNumber.value || '';
    const location = this.infoForm.controls.location.value || '';
    const locationPlaceId = this.infoForm.controls.locationPlaceId.value || '';
    const birthDate = this.infoForm.controls.birthDate.value || '';
    const introduction = this.infoForm.controls.introduction.value || '';

    const result = await this.auth.register(
      {
        phone,
        code,
        userName,
        realName,
        idCardNumber,
        location,
        locationPlaceId,
        birthDate,
        introduction,
      },
      this.avatarFile,
    );

    this.registering.set(false);

    if (!result.ok) {
      const t = await this.toastCtrl.create({
        message: result.message,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    const t = await this.toastCtrl.create({
      message: this.t.registerSuccess.replace('${userName}', userName),
      duration: 2000,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
    });
    await t.present();

    // 注册成功后关闭 Modal
    await this.modalCtrl.dismiss();
  }

  async closeModal() {
    await this.modalCtrl.dismiss();
  }

  async openLocationPicker() {
    const modal = await this.modalCtrl.create({
      component: LocationPickerComponent,
      cssClass: 'location-picker-modal',
      componentProps: {
        selectedPlaceId:
          this.infoForm.controls.locationPlaceId.value || undefined,
        selectedText: this.infoForm.controls.location.value || undefined,
      },
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role !== 'confirm' || !data?.selected) return;

    this.infoForm.patchValue({
      location: data.selected.text,
      locationPlaceId: data.selected.placeId,
    });
  }
}
