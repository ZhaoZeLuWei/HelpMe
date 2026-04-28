import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonBadge, IonButton, IonButtons, IonCard, IonIcon, IonItem, IonLabel, IonText } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab4-events-panel',
  standalone: true,
  imports: [CommonModule, IonButton, IonButtons, IonBadge, IonCard, IonIcon, IonItem, IonLabel, IonText],
  templateUrl: './tab4-events-panel.component.html',
  styleUrl: './tab4-events-panel.component.scss',
})
export class Tab4EventsPanelComponent {
  @Input() events: any[] = [];
  @Input() eventStats: any;
  @Input() isLoading = false;
  @Input() filter: 'all' | 'published' | 'pending' | 'active' | 'review' | 'done' = 'all';
  @Input() deletingIds = new Set<number>();
  @Input() blockedEditIds = new Set<number>();
  @Input() t: any;

  @Output() filterChange = new EventEmitter<'all' | 'published' | 'pending' | 'active' | 'review' | 'done'>();
  @Output() viewDetail = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();

  setFilter(filter: 'all' | 'published' | 'pending' | 'active' | 'review' | 'done') {
    this.filterChange.emit(filter);
  }

  trackById(_: number, item: any) {
    return item.id;
  }
}
