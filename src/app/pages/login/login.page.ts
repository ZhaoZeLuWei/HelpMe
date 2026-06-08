import { Component, signal, inject } from '@angular/core';
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
import {
  AliyunCaptchaService,
  CAPTCHA_BUSY_ERROR,
} from '../../services/aliyun-captcha.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
})
export class LoginPage {
  private auth = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);
  private languageService = inject(LanguageService);
  private captchaService = inject(AliyunCaptchaService);

  t = this.languageService.getTranslations('zh').login;

  constructor() {
    this.languageService.currentLang$.subscribe((lang) => {
      this.t = this.languageService.getTranslations(lang).login;
    });
  }

  form = new FormGroup({
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{11}$/),
    ]),
    code: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{4}$/),
    ]),
  });

  sending = signal(false);
  sendCooldown = signal(0); // 秒
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  async sendCode() {
    if (this.form.controls.phone.invalid) {
      const t = await this.toastCtrl.create({
        message: this.t.invalidPhone,
        duration: 750,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    if (this.sending() || this.sendCooldown() > 0) return;

    const phone = this.form.controls.phone.value || '';
    this.sending.set(true);

    try {
      const checkResult = await this.auth.checkPhoneExists(phone);

      if (!checkResult) {
        const toast = await this.toastCtrl.create({
          message: this.t.phoneCheckFailed,
          duration: 1500,
          position: 'bottom',
          positionAnchor: 'main-tab-bar',
        });
        await toast.present();
        return;
      }

      if (!checkResult.exists) {
        const toast = await this.toastCtrl.create({
          message: this.t.phoneNotRegistered,
          duration: 1500,
          position: 'bottom',
          positionAnchor: 'main-tab-bar',
        });
        await toast.present();
        return;
      }

      let captchaData = null;
      try {
        captchaData = await this.captchaService.getValidate();
      } catch (err) {
        const message =
          err instanceof Error && err.message === CAPTCHA_BUSY_ERROR
            ? this.t.captchaInProgress
            : err instanceof Error
              ? err.message
              : this.t.captchaLoadFailed;
        const toast = await this.toastCtrl.create({
          message,
          duration: 1500,
          position: 'bottom',
          positionAnchor: 'main-tab-bar',
        });
        await toast.present();
        return;
      }

      if (!captchaData) return;

      const sendResult = await this.auth.sendVerificationCode(
        phone,
        captchaData,
      );
      if (!sendResult?.success) {
        const toast = await this.toastCtrl.create({
          message: sendResult?.error || this.t.codeSendFailed,
          duration: 1500,
          position: 'bottom',
          positionAnchor: 'main-tab-bar',
        });
        await toast.present();
        return;
      }

      const toast = await this.toastCtrl.create({
        message: sendResult.message || this.t.codeSent,
        duration: 750,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await toast.present();

      this.startSendCooldown();
    } finally {
      this.sending.set(false);
    }
  }

  private startSendCooldown() {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
    this.sendCooldown.set(60);
    this.cooldownTimer = setInterval(() => {
      const next = this.sendCooldown() - 1;
      this.sendCooldown.set(next);
      if (next <= 0 && this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }

  async submit() {
    if (this.form.invalid) {
      const t = await this.toastCtrl.create({
        message: this.t.formIncomplete,
        duration: 750,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    const phone = this.form.controls.phone.value || '';
    const code = this.form.controls.code.value || '';

    const result = await this.auth.loginWithPhone(phone, code);
    if (!result.ok) {
      const t = await this.toastCtrl.create({
        message: result.message,
        duration: 750,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    const u = this.auth.currentUser;
    const name = u?.UserName ?? u?.userName ?? u?.name ?? '';
    const message = name
      ? `${this.t.loginSuccess.replace('！', '')}，${name}！`
      : this.t.loginSuccess;

    const t = await this.toastCtrl.create({
      message,
      duration: 750,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
    });
    await t.present();

    await this.modalCtrl.dismiss();
  }

  async closeModal() {
    await this.modalCtrl.dismiss();
  }

  async goToRegister() {
    await this.modalCtrl.dismiss();
    const modal = await this.modalCtrl.create({
      component: (await import('../register/register.page')).RegisterPage,
    });
    await modal.present();
  }
}
