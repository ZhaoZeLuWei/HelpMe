import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab4-quick-actions',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './tab4-quick-actions.component.html',
  styleUrl: './tab4-quick-actions.component.scss',
})
export class Tab4QuickActionsComponent {
  @Input() t: any;
  @Input() favoritesDesc = '';
  @Input() followsDesc = '';

  @Output() openFavorites = new EventEmitter<void>();
  @Output() openFollows = new EventEmitter<void>();
}
