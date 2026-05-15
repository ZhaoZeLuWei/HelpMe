import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Tab4UserService } from '../../services/tab4/tab4-user.service';
import { DynamicTranslationService } from '../../services/dynamic-translation.service';
import {
  EventCardData,
  ShowEventComponent,
} from '../show-event/show-event.component';
import { mapFavoritesToEventCards } from '../../utils/event-card.mapper';

@Component({
  selector: 'app-tab4-favorites-modal',
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
    IonText,
    ShowEventComponent,
  ],
  templateUrl: './tab4-favorites-modal.component.html',
  styleUrl: './tab4-favorites-modal.component.scss',
})
export class Tab4FavoritesModalComponent implements OnChanges {
  private readonly userService = inject(Tab4UserService);
  private readonly dynTrans = inject(DynamicTranslationService);

  @Input() isOpen = false;
  @Input() t: any;
  /** 父页已拉取的收藏列表；非 null 时打开弹窗不再重复请求 */
  @Input() prefetchedFavorites: EventCardData[] | null = null;

  @Output() didDismiss = new EventEmitter<void>();
  @Output() cardClick = new EventEmitter<EventCardData>();
  @Output() countChange = new EventEmitter<number>();
  @Output() listChange = new EventEmitter<EventCardData[]>();

  favoritesList: EventCardData[] = [];
  isLoading = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prefetchedFavorites'] && this.prefetchedFavorites !== null) {
      this.applyFavoritesList(this.prefetchedFavorites);
    }
    if (changes['isOpen']?.currentValue === true) {
      if (this.prefetchedFavorites !== null) {
        this.applyFavoritesList(this.prefetchedFavorites);
        return;
      }
      void this.loadFavorites();
    }
  }

  private applyFavoritesList(list: EventCardData[]): void {
    this.favoritesList = list;
    this.isLoading = false;
    this.countChange.emit(list.length);
    this.listChange.emit(list);
    setTimeout(() => this.dynTrans.translateAll().subscribe(), 200);
  }

  onDismiss(): void {
    this.didDismiss.emit();
  }

  onCardClick(event: EventCardData): void {
    this.cardClick.emit(event);
  }

  private async loadFavorites(): Promise<void> {
    this.isLoading = true;
    try {
      const raw = await this.userService.fetchFavoritesRaw();
      this.applyFavoritesList(mapFavoritesToEventCards(raw));
    } catch (e) {
      console.error('loadFavorites error', e);
      this.isLoading = false;
    }
  }
}
