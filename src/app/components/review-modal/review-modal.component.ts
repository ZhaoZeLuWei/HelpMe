import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { star, starOutline } from 'ionicons/icons';
import {
  ReactiveFormsModule,
  FormControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonTextarea,
} from '@ionic/angular/standalone';
import { LanguageService } from '../../services/language.service';

export interface ReviewSubmitPayload {
  Score: number;
  Text: string;
}

@Component({
  selector: 'app-review-modal',
  templateUrl: './review-modal.component.html',
  styleUrls: ['./review-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonTextarea,
  ],
})
export class ReviewModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isSaving = false;
  @Output() didDismiss = new EventEmitter<void>();
  @Output() submit = new EventEmitter<ReviewSubmitPayload>();

  t: any;
  reviewForm: FormGroup;
  stars = [1, 2, 3, 4, 5];

  constructor(
    private fb: FormBuilder,
    private languageService: LanguageService,
  ) {
    addIcons({ star, starOutline });
    this.t = this.languageService.getTranslations(
      this.languageService.getCurrentLang(),
    );
    this.languageService.currentLang$.subscribe((lang) => {
      this.t = this.languageService.getTranslations(lang);
    });
    this.reviewForm = this.fb.group({
      Score: [5, [Validators.required]],
      Text: ['', [Validators.maxLength(200)]],
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && !this.isOpen) {
      this.reviewForm.reset({ Score: 5, Text: '' });
    }
  }

  selectStar(value: number) {
    this.reviewForm.patchValue({ Score: value });
  }

  get currentScore(): number {
    return this.reviewForm.value.Score || 0;
  }

  get textLength(): number {
    return (this.reviewForm.value.Text || '').length;
  }

  get textControl() {
    return this.reviewForm.get('Text') as FormControl;
  }

  close() {
    this.didDismiss.emit();
  }

  onSubmit() {
    if (this.reviewForm.invalid || this.isSaving) return;
    this.submit.emit({
      Score: this.reviewForm.value.Score,
      Text: this.reviewForm.value.Text || '',
    });
  }
}
