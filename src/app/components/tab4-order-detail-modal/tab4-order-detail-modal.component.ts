import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateTextPipe } from '../../pipes/translate-text.pipe';
import { resolveMediaUrl } from '../../utils/media-url.util';

@Component({
  selector: 'app-tab4-order-detail-modal',
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
    IonIcon,
    TranslateTextPipe,
  ],
  templateUrl: './tab4-order-detail-modal.component.html',
  styleUrl: './tab4-order-detail-modal.component.scss',
})
export class Tab4OrderDetailModalComponent {
  @Input() isOpen = false;
  @Input() order: any = null;
  @Input() t: any;

  @Output() didDismiss = new EventEmitter<void>();

  getAssetUrl(path: string): string {
    return resolveMediaUrl(path, '');
  }

  onDismiss(): void {
    this.didDismiss.emit();
  }
}
