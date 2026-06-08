import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { star, starOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonAvatar,
  IonText,
  IonIcon,
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { resolveMediaUrl } from '../../utils/media-url.util';
import { LanguageService } from '../../services/language.service';
import { DynamicTranslationService } from '../../services/dynamic-translation.service';
import { TranslateTextPipe } from '../../pipes/translate-text.pipe';

export interface ReviewDetail {
  id: number;
  authorName: string;
  authorAvatar: string;
  rating: number;
  content: string;
  createTime: string;
}

@Component({
  selector: 'app-review-detail-modal',
  templateUrl: './review-detail-modal.component.html',
  styleUrls: ['./review-detail-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonAvatar,
    IonText,
    IonIcon,
    TranslateTextPipe,
  ],
})
export class ReviewDetailModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() orderId: number | null = null;
  @Output() didDismiss = new EventEmitter<void>();

  private http = inject(HttpClient);
  private apiBase = environment.apiBase;
  private languageService = inject(LanguageService);
  private dynTrans = inject(DynamicTranslationService);

  t: any;
  isLoading = false;
  reviews: ReviewDetail[] = [];

  constructor() {
    addIcons({ star, starOutline, chatbubbleEllipsesOutline });
    this.t = this.languageService.getTranslations(
      this.languageService.getCurrentLang(),
    );
    this.languageService.currentLang$.subscribe((lang) => {
      this.t = this.languageService.getTranslations(lang);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen && this.orderId) {
      this.loadReviews(this.orderId);
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.reviews = [];
    }
  }

  private loadReviews(orderId: number) {
    this.isLoading = true;
    this.reviews = [];
    this.http.get<any>(`${this.apiBase}/reviews?orderId=${orderId}`).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.reviews)) {
          this.reviews = res.reviews;
        }
      },
      error: (err) => {
        console.error('获取评价列表失败', err);
      },
      complete: () => {
        this.isLoading = false;
        setTimeout(() => this.dynTrans.translateAll().subscribe(), 200);
      },
    });
  }

  getAvatarUrl(path?: string): string {
    return resolveMediaUrl(path);
  }

  close() {
    this.didDismiss.emit();
  }
}
