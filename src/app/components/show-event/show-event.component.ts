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
  createTime: string; // 新增
  creatorId: number;
  title: string; // 新增
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
  // 接收父组件传递进来的数据
  @Input() event!: EventCardData;

  // 向父组件发送点击事件
  @Output() cardClick = new EventEmitter<EventCardData>();

  private readonly API_BASE = environment.apiBase;
  private readonly PLACEHOLDER_IMG =
    'https://picsum.photos/seed/default/600/400'; //展示默认图片
  private readonly PLACEHOLDER_ICON = 'assets/icon/user.svg';

  // 后端路径 /img/...
  imgUrl(p: any): string {
    if (!p) return this.PLACEHOLDER_IMG;
    const s = String(p).trim();
    if (!s) return this.PLACEHOLDER_IMG;
    if (s.startsWith('/')) return this.API_BASE + s;
    return this.PLACEHOLDER_IMG;
  }
  // 处理事件加载错误
  onImageError(event: any) {
    if (event.target.src !== this.PLACEHOLDER_IMG) {
      event.target.src = this.PLACEHOLDER_IMG;
    }
  }
  // 处理头像的图片路径
  avatarUrl(p?: string): string {
    if (!p) return this.PLACEHOLDER_ICON;
    const s = String(p).trim();
    if (!s) return this.PLACEHOLDER_ICON;
    if (s.startsWith('/')) return this.API_BASE + s;
    return this.PLACEHOLDER_ICON;
  }
  // 处理头像加载错误
  onAvatarError(event: any) {
    if (event.target.src !== this.PLACEHOLDER_ICON) {
      event.target.src = this.PLACEHOLDER_ICON;
    }
  }
  // 处理点击逻辑
  onCardClick() {
    this.cardClick.emit(this.event);
  }
}
