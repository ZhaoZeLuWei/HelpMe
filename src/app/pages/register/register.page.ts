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
import { environment } from '../../../environments/environment';
import { LocationPickerComponent } from '../../components/location-picker/location-picker.component';
import { LanguageService } from '../../services/language.service';

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
  private langService = inject(LanguageService);

  t = this.langService.getTranslations('zh').register;

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  step = signal<'verify' | 'info'>('verify');

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

  avatarFile: File | null = null;
  avatarPreview: string | null = null;
  defaultAvatar = 'assets/icon/user.svg';

  sending = signal(false);
  sendCooldown = signal(0);
  registering = signal(false);

  constructor() {
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).register;
    });
  }

  async sendCode() {
    if (this.verifyForm.controls.phone.invalid) {
      await this.showToast(this.t.phoneRequired);
      return;
    }

    if (this.sendCooldown() > 0) return;

    const phone = this.verifyForm.controls.phone.value || '';
    try {
      const resp = await fetch(`${this.auth['API_BASE']}/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        await this.showToast(data?.error || this.t.registerFail);
        return;
      }

      if (data.exists) {
        await this.showToast(this.t.phoneRegistered);
        return;
      }
    } catch (err) {
      console.error('Check phone error:', err);
      await this.showToast(this.t.serverUnreachable);
      return;
    }

    await this.showToast(this.t.tip);

    this.sendCooldown.set(60);
    this.sending.set(true);
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
      await this.showToast(this.t.pleaseComplete);
      return;
    }

    const code = this.verifyForm.controls.code.value || '';
    if (code !== '1234') {
      await this.showToast(this.t.invalidCode);
      return;
    }

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

    if (!file.type.startsWith('image/')) {
      await this.showToast('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      await this.showToast('图片大小不能超过5MB');
      return;
    }

    this.avatarFile = file;

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
      let message = this.t.pleaseComplete;
      if (this.infoForm.controls.userName.invalid) message = '请输入用户名（2-20个字符）';
      else if (this.infoForm.controls.realName.invalid) message = '请输入真实姓名（2-20个字符）';
      else if (this.infoForm.controls.idCardNumber.invalid) message = '请输入有效的18位身份证号';
      else if (this.infoForm.controls.location.invalid) message = '请输入所在地';
      else if (this.infoForm.controls.birthDate.invalid) message = '请选择出生日期';

      await this.showToast(message);
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
      await this.showToast(result.message);
      return;
    }

    await this.showToast(`${this.t.registerSuccess}, ${userName}!`);
    await this.modalCtrl.dismiss();
  }

  async closeModal() {
    await this.modalCtrl.dismiss();
  }

  async openLocationPicker() {
    const modal = await this.modalCtrl.create({
      component: LocationPickerComponent,
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

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
    });
    await toast.present();
  }
}
