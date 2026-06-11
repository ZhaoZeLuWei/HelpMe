import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { DatePipe } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonItem,
  IonTextarea,
  IonIcon,
  IonSpinner,
  IonAvatar,
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../services/language.service';
import { TranslateTextPipe } from '../../pipes/translate-text.pipe';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  sendOutline,
  checkmarkCircleOutline,
  chatbubbleEllipsesOutline,
  refreshOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-ban-appeal',
  templateUrl: './ban-appeal.page.html',
  styleUrls: ['./ban-appeal.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonItem,
    IonTextarea,
    IonIcon,
    IonSpinner,
    IonAvatar,
    TranslateTextPipe,
  ],
})
export class BanAppealPage implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private toastCtrl = inject(ToastController);
  private langService = inject(LanguageService);

  t = this.langService.getTranslations('zh').banAppeal;
  phone = '';
  submitted = false;
  submitting = false;

  // 回复消息列表
  messages = signal<any[]>([]);
  loadingMessages = false;
  showReplies = false;

  appealInput = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(5)],
  });

  constructor() {
    addIcons({
      alertCircleOutline,
      sendOutline,
      checkmarkCircleOutline,
      chatbubbleEllipsesOutline,
      refreshOutline,
    });
  }

  ngOnInit() {
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).banAppeal;
    });

    const state = history.state;
    this.phone =
      state?.phone || sessionStorage.getItem('ban_appeal_phone') || '';

    if (!this.phone) {
      this.router.navigate(['/tabs/tab4'], { replaceUrl: true });
      return;
    }

    // 自动加载消息（用户可能之前已提交过申诉）
    this.loadMessages();
  }

  submitAppeal() {
    const msg = this.appealInput.value.trim();
    if (!msg || this.submitting) return;

    this.submitting = true;
    this.http
      .post<any>(`${environment.apiBase}/api/support/appeal`, {
        phone: this.phone,
        message: msg,
      })
      .subscribe({
        next: async (res) => {
          this.submitting = false;
          if (res.success) {
            this.submitted = true;
            this.appealInput.reset();
            this.loadMessages();
            const toast = await this.toastCtrl.create({
              message: res.message || this.t.submitSuccess,
              duration: 2000,
              position: 'bottom',
              color: 'success',
            });
            await toast.present();
          } else {
            this.showToast(res.message || this.t.submitFailed);
          }
        },
        error: () => {
          this.submitting = false;
          this.showToast(this.t.submitFailed);
        },
      });
  }

  loadMessages() {
    this.loadingMessages = true;
    this.http
      .get<any>(`${environment.apiBase}/api/support/appeal/messages`, {
        params: { phone: this.phone },
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.messages.set(res.data.messages || []);
          }
          this.loadingMessages = false;
        },
        error: () => {
          this.loadingMessages = false;
        },
      });
  }

  toggleReplies() {
    this.showReplies = !this.showReplies;
    if (this.showReplies) {
      this.loadMessages();
    }
  }

  isMyMessage(msg: any): boolean {
    // 申诉人是 userId (senderId > 0)，管理员 senderId = 0
    return msg.senderId > 0;
  }

  isSystemMessage(msg: any): boolean {
    return (
      msg.senderId === -1 ||
      msg.userName ===
        this.langService.getTranslations(this.langService.getCurrentLang())
          .chatDetail?.systemNotification
    );
  }

  goBack() {
    this.router.navigate(['/tabs/tab4'], { replaceUrl: true });
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}
