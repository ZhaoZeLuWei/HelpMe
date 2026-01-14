import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

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
}

@Component({
  selector: 'app-show-event',
  templateUrl: './show-event.component.html',
  styleUrls: ['./show-event.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ShowEventComponent {
  // 接收父组件传递进来的数据
  @Input() event!: EventCardData;

  // 向父组件发送点击事件
  @Output() cardClick = new EventEmitter<EventCardData>();

  // 处理点击逻辑
  onCardClick() {
    this.cardClick.emit(this.event);
  }
}