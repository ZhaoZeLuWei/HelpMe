import {
  Component,
  Input,
  Output,
  EventEmitter,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../services/language.service';

// 定义小卡片的数据接口
export interface EventCardData {
  id: string;
  cardImage: string;
  icon: string;
  distance: string;
  name: string;
  address: string;
  demand: string;
  price: string;
  avatar: string;
  createTime: string;
  creatorId: number;
  title: string;
}

@Component({
  selector: 'app-show-event',
  templateUrl: './show-event.component.html',
  styleUrls: ['./show-event.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ShowEventComponent {
  @Input() event!: EventCardData;
  @Output() cardClick = new EventEmitter<EventCardData>();

  private readonly API_BASE = environment.apiBase;
  private readonly PLACEHOLDER_IMG = 'https://picsum.photos/seed/default/600/400';
  private readonly PLACEHOLDER_ICON = 'assets/icon/user.svg';

  // 翻译对象 - 声明但不初始化
  t: any;

  constructor(private langService: LanguageService) {
    // 在构造函数中初始化翻译对象
    this.t = this.langService.getTranslations('zh').shared.eventCard;
    
    // 监听语言变化
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).shared.eventCard;
    });
  }

  imgUrl(p: any): string {
    if (!p) return this.PLACEHOLDER_IMG;
    const s = String(p).trim();
    if (!s) return this.PLACEHOLDER_IMG;
    if (s.startsWith('/')) return this.API_BASE + s;
    return this.PLACEHOLDER_IMG;
  }

  onImageError(event: any) {
    if (event.target.src !== this.PLACEHOLDER_IMG) {
      event.target.src = this.PLACEHOLDER_IMG;
    }
  }

  avatarUrl(p?: string): string {
    if (!p) return this.PLACEHOLDER_ICON;
    const s = String(p).trim();
    if (!s) return this.PLACEHOLDER_ICON;
    if (s.startsWith('/')) return this.API_BASE + s;
    return this.PLACEHOLDER_ICON;
  }

  onAvatarError(event: any) {
    if (event.target.src !== this.PLACEHOLDER_ICON) {
      event.target.src = this.PLACEHOLDER_ICON;
    }
  }

  onCardClick() {
    this.cardClick.emit(this.event);
  }
}
