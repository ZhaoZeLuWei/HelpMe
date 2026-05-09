import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonCard,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab4-profile-card',
  standalone: true,
  imports: [CommonModule, IonCard, IonAvatar, IonBadge, IonButton, IonIcon],
  templateUrl: './tab4-profile-card.component.html',
  styleUrl: './tab4-profile-card.component.scss',
})
export class Tab4ProfileCardComponent {
  private readonly apiBase = environment.apiBase;

  @Input() userInfo: any;
  @Input() t: any;

  @Output() editProfile = new EventEmitter<void>();

  onEditProfile() {
    this.editProfile.emit();
  }

  formatRating(value: any): string {
    const num = Number(value) || 0;
    return num.toFixed(1);
  }

  getAvatarUrl(avatar?: string): string {
    if (!avatar) return '/assets/icon/user.svg';
    return avatar.startsWith('http') ? avatar : `${this.apiBase}${avatar}`;
  }
}
