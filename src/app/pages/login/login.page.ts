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
import { AliyunCaptchaService } from '../../services/aliyun-captcha.service';

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

    if (this.sendCooldown() > 0) return;

    const phone = this.form.controls.phone.value || '';

    // 先检查手机号是否已注册（登录页面需要手机号已注册）
    this.sending.set(true);
    const checkResult = await this.auth.checkPhoneExists(phone);

    if (!checkResult) {
      this.sending.set(false);
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
      this.sending.set(false);
      const toast = await this.toastCtrl.create({
        message: this.t.phoneNotRegistered,
        duration: 1500,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await toast.present();
      return;
    }

    // 手机号已注册，生产环境先通过阿里云 H5 SDK 获取验证结果
    let captchaData = null;
    try {
      captchaData = await this.captchaService.getValidate();
    } catch (err) {
      this.sending.set(false);
      const toast = await this.toastCtrl.create({
        message: err instanceof Error ? err.message : this.t.captchaLoadFailed,
        duration: 1500,
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
      ? `${this.t.loginSuccess.replace('！', '')}，${name}，${this.t.loginSuccess}`
      : this.t.loginSuccess;

    const t = await this.toastCtrl.create({
      message,
      duration: 750,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
    });
    await t.present();

    // 登录成功后关闭 Modal
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
