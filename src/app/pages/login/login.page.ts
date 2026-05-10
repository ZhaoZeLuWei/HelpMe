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
  private langService = inject(LanguageService);

  t = this.langService.getTranslations('zh').login;

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
  sendCooldown = signal(0);

  constructor() {
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).login;
    });
  }

  async sendCode() {
    if (this.form.controls.phone.invalid) {
      await this.showToast(this.t.invalidPhone);
      return;
    }

    if (this.sendCooldown() > 0) return;

    const phone = this.form.controls.phone.value || '';

    this.sending.set(true);
    const checkResult = await this.auth.checkPhoneExists(phone);

    if (!checkResult) {
      this.sending.set(false);
      await this.showToast(this.t.verifyFail);
      return;
    }

    if (!checkResult.exists) {
      this.sending.set(false);
      await this.showToast(this.t.notRegistered);
      return;
    }

    await this.showToast(this.t.codeSent);

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
      await this.showToast(this.t.incomplete);
      return;
    }

    const phone = this.form.controls.phone.value || '';
    const code = this.form.controls.code.value || '';

    const result = await this.auth.loginWithPhone(phone, code);
    if (!result.ok) {
      await this.showToast(result.message);
      return;
    }

    const u = this.auth.currentUser;
    const name = u?.UserName ?? u?.userName ?? u?.name ?? '';
    const message = this.t.loginSuccess.replace('{name}', name);

    await this.showToast(message);
    await this.modalCtrl.dismiss();
  }

  async closeModal() {
    await this.modalCtrl.dismiss();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 750,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
    });
    await toast.present();
  }
}
