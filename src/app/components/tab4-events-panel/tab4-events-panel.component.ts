import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonIcon,
  IonItem,
  IonLabel,
  IonText,
} from '@ionic/angular/standalone';
import { TranslateTextPipe } from '../../pipes/translate-text.pipe';

@Component({
  selector: 'app-tab4-events-panel',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonButtons,
    IonBadge,
    IonCard,
    IonIcon,
    IonItem,
    IonLabel,
    IonText,
    TranslateTextPipe,
  ],
  templateUrl: './tab4-events-panel.component.html',
  styleUrl: './tab4-events-panel.component.scss',
})
export class Tab4EventsPanelComponent {
  @Input() events: any[] = [];
  @Input() isLoading = false;
  @Input() deletingIds = new Set<number>();
  @Input() blockedEditIds = new Set<number>();
  @Input() blockedEditOnlyIds = new Set<number>();
  @Input() blockedToggleIds = new Set<number>();
  @Input() t: any;

  @Output() viewDetail = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();
  @Output() toggleStatus = new EventEmitter<any>();

  trackById(_: number, item: any) {
    return item.id;
  }
}
