import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { UniversalSearchComponent, EventCardData } from '../components/universal-search/universal-search.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    UniversalSearchComponent
  ]
})
export class Tab2Page {

  // 数据现在符合队友的 EventCardData 接口
  eventsData = signal<EventCardData[]>([
    {
      id: '101',
      cardImage: 'https://picsum.photos/seed/101/400/200',
      icon: 'construct',
      distance: '500m',
      name: '封金',
      address: '广科社区',
      demand: '家里水龙头漏水严重，急需修理水龙头，有工具最好', // <--- 搜这个字段
      price: '50',
      avatar: 'https://picsum.photos/seed/fj/100/100'
    },
    {
      id: '102',
      cardImage: 'https://picsum.photos/seed/102/400/200',
      icon: 'broom',
      distance: '1.2km',
      name: '张阿姨',
      address: '001社区',
      demand: '需要做一次全屋的深度清洁',
      price: '120',
      avatar: 'https://picsum.photos/seed/zhang/100/100'
    },
    {
      id: '103',
      cardImage: 'https://picsum.photos/seed/103/400/200',
      icon: 'medkit',
      distance: '200m',
      name: '李四',
      address: '002社区',
      demand: '帮忙去校门口买点药',
      price: '20',
      avatar: 'https://picsum.photos/seed/lisi/100/100'
    }
  ]);

  constructor() {}
}
