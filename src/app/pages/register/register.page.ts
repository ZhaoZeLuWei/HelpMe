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
        message: '请输入有效的11位手机号',
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
    try {
      const resp = await fetch(`${this.auth['API_BASE']}/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        const t = await this.toastCtrl.create({
          message: data?.error || '检查手机号失败，请稍后重试',
          duration: 2000,
          position: 'bottom',
          positionAnchor: 'main-tab-bar',
        });
        await t.present();
        return;
      }

      if (data.exists) {
        const t = await this.toastCtrl.create({
          message: '该手机号已注册，请直接登录',
          duration: 2000,
          position: 'bottom',
          positionAnchor: 'main-tab-bar',
        });
        await t.present();
        return;
      }
    } catch (err) {
      console.error('Check phone error:', err);
      const t = await this.toastCtrl.create({
        message: '无法连接到服务器',
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    // 模拟发送验证码
    const toast = await this.toastCtrl.create({
      message: '验证码已发送，验证码为1234',
      duration: 2000,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
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

  async nextStep() {
    if (this.verifyForm.invalid) {
      const t = await this.toastCtrl.create({
        message: '请完善手机号和验证码',
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await t.present();
      return;
    }

    // 验证验证码是否正确（简单验证）
    const code = this.verifyForm.controls.code.value || '';
    if (code !== '1234') {
      const t = await this.toastCtrl.create({
        message: '验证码错误',
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
        message: '请选择图片文件',
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
        message: '图片大小不能超过5MB',
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
      let message = '请完善必填信息';
      if (this.infoForm.controls.userName.invalid)
        message = '请输入用户名（2-20个字符）';
      else if (this.infoForm.controls.realName.invalid)
        message = '请输入真实姓名（2-20个字符）';
      else if (this.infoForm.controls.idCardNumber.invalid)
        message = '请输入有效的18位身份证号';
      else if (this.infoForm.controls.location.invalid)
        message = '请输入所在地';
      else if (this.infoForm.controls.birthDate.invalid)
        message = '请选择出生日期';

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
      message: `注册成功，欢迎 ${userName}！`,
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
}
