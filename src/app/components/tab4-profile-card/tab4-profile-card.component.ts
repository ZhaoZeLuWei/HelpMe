import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { resolveMediaUrl } from '../../utils/media-url.util';
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonCard,
  IonIcon,
} from '@ionic/angular/standalone';
import { TranslateTextPipe } from '../../pipes/translate-text.pipe';

@Component({
  selector: 'app-tab4-profile-card',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonAvatar,
    IonBadge,
    IonButton,
    IonIcon,
    TranslateTextPipe,
  ],
  templateUrl: './tab4-profile-card.component.html',
  styleUrl: './tab4-profile-card.component.scss',
})
export class Tab4ProfileCardComponent {
  @Input() userInfo: any;
  @Input() t: any;

  @Output() editProfile = new EventEmitter<void>();
  @Output() showFollowers = new EventEmitter<void>();

  onEditProfile() {
    this.editProfile.emit();
  }

  formatRating(value: any): string {
    const num = Number(value) || 0;
    return num.toFixed(1);
  }

  getAvatarUrl(avatar?: string): string {
    return resolveMediaUrl(avatar);
  }
}
