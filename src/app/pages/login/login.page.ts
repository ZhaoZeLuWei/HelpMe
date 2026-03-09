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
        message: '请输入有效的11位手机号',
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
        message: '无法验证手机号，请稍后重试',
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
        message: '该手机号未注册，请先注册',
        duration: 1500,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await toast.present();
      return;
    }

    // 手机号已注册，发送验证码
    const toast = await this.toastCtrl.create({
      message: '验证码已发送，验证码为1234',
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
        message: '请完善手机号和验证码',
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
    const message = name ? `登录成功，${name}，欢迎您！` : '登录成功，欢迎您！';

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
}
