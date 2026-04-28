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

@Component({
  selector: 'app-tab4-orders-panel',
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
  ],
  templateUrl: './tab4-orders-panel.component.html',
  styleUrl: './tab4-orders-panel.component.scss',
})
export class Tab4OrdersPanelComponent {
  @Input() orders: any[] = [];
  @Input() orderStats: any;
  @Input() isLoading = false;
  @Input() filter: 'all' | 'pending' | 'active' | 'review' | 'done' = 'all';
  @Input() t: any;

  @Output() filterChange = new EventEmitter<
    'all' | 'pending' | 'active' | 'review' | 'done'
  >();
  @Output() viewDetail = new EventEmitter<number>();
  @Output() confirm = new EventEmitter<number>();
  @Output() complete = new EventEmitter<number>();
  @Output() review = new EventEmitter<number>();
  @Output() cancel = new EventEmitter<number>();

  setFilter(filter: 'all' | 'pending' | 'active' | 'review' | 'done') {
    this.filterChange.emit(filter);
  }
}
