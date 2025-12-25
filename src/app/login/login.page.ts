import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
})
export class LoginPage {
  form = new FormGroup({
    phone: new FormControl('', [Validators.required, Validators.pattern(/^\d{11}$/)]),
    code: new FormControl('', [Validators.required, Validators.pattern(/^\d{4}$/)])
  });

  sending = signal(false);
  sendCooldown = signal(0); // 秒

  //使用 AuthService 调用后端 API 并处理 token

  constructor(private auth: AuthService, private toastCtrl: ToastController) {}

  async sendCode() {
    if (this.form.controls.phone.invalid) {
      const t = await this.toastCtrl.create({ message: '请输入有效的11位手机号', duration: 3000 });
      await t.present();
      return;
    }

    if (this.sendCooldown() > 0) return;

    // 模拟发送
    const toast = await this.toastCtrl.create({
      message: '验证码已发送，验证码为1234',
      duration: 3000
    });
    await toast.present();

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

  async submit() {
    if (this.form.invalid) {
      const t = await this.toastCtrl.create({ message: '请完善手机号和验证码', duration: 3000 });
      await t.present();
      return;
    }

    const phone = this.form.controls.phone.value || '';
    const code = this.form.controls.code.value || '';

    const ok = this.auth.loginWithPhone(phone, code);
    if (!ok) {
      const t = await this.toastCtrl.create({ message: '手机号或验证码错误', duration: 3000 });
      await t.present();
      return;
    }
    const t = await this.toastCtrl.create({ message: '登录成功', duration: 3000 });
    await t.present();
    // 登录成功后 AuthService 已更新，Tab4 会订阅到变化并显示个人中心
  }
}
