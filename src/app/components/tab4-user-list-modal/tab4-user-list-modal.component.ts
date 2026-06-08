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
import { AuthService } from '../../services/auth.service';
import { DynamicTranslationService } from '../../services/dynamic-translation.service';
import { environment } from '../../../environments/environment';
import { TranslateTextPipe } from '../../pipes/translate-text.pipe';
import { resolveMediaUrl } from '../../utils/media-url.util';

export type Tab4UserListMode = 'follows' | 'followers';

@Component({
  selector: 'app-tab4-user-list-modal',
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
    TranslateTextPipe,
  ],
  templateUrl: './tab4-user-list-modal.component.html',
  styleUrl: './tab4-user-list-modal.component.scss',
})
export class Tab4UserListModalComponent implements OnChanges {
  private readonly apiBase = environment.apiBase;
  private readonly auth = inject(AuthService);
  private readonly dynTrans = inject(DynamicTranslationService);

  @Input() isOpen = false;
  @Input() mode: Tab4UserListMode = 'follows';
  @Input() t: any;

  @Output() didDismiss = new EventEmitter<void>();
  @Output() userClick = new EventEmitter<any>();
  @Output() countChange = new EventEmitter<number>();

  users: any[] = [];
  isLoading = false;

  get title(): string {
    return this.mode === 'followers'
      ? this.t.followersTitle
      : this.t.followsTitle;
  }

  get emptyTitle(): string {
    return this.mode === 'followers' ? this.t.noFollowers : this.t.noFollows;
  }

  get emptyHint(): string {
    return this.mode === 'followers'
      ? this.t.noFollowersHint
      : this.t.noFollowsHint;
  }

  get emptyIcon(): string {
    return this.mode === 'followers' ? 'heart-outline' : 'people-outline';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      void this.loadUsers();
    }
  }

  onDismiss(): void {
    this.didDismiss.emit();
  }

  getAssetUrl(path?: string): string {
    return resolveMediaUrl(path);
  }

  async removeFollow(userId: number, event: Event): Promise<void> {
    event.stopPropagation();
    const result = await this.auth.toggleFollow(userId);
    if (result === false) {
      this.users = this.users.filter((u) => u.UserId !== userId);
      this.countChange.emit(this.users.length);
    }
  }

  private async loadUsers(): Promise<void> {
    this.isLoading = true;
    try {
      const url =
        this.mode === 'followers'
          ? `${this.apiBase}/follows/followers`
          : `${this.apiBase}/follows`;
      const resp = await fetch(url, { headers: this.auth.getAuthHeader() });
      const data = await resp.json().catch(() => null);

      if (data?.success) {
        const list = this.mode === 'followers' ? data.followers : data.follows;
        this.users = Array.isArray(list) ? list : [];
        this.countChange.emit(this.users.length);
      }
    } catch (e) {
      console.error('loadUsers error', e);
    } finally {
      this.isLoading = false;
      if (this.mode === 'follows') {
        setTimeout(() => this.dynTrans.translateAll().subscribe(), 200);
      }
    }
  }
}
