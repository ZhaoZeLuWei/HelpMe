import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular'; 
import { CommonModule } from '@angular/common'; 

// 小卡片类型定义（新增cardImage字段，对应“花、药”等图片）
interface CardItem {
  id: string;
  cardImage: string; // 小卡片顶部图片（图标/图片链接，对应手绘图的花、药）
  icon: string;      // 距离旁的小图标
  distance: string;  // 距离
  name: string;      // 姓名
  address: string;   // 地址
  demand: string;    // 需求描述
  price: string;     // 价格
  avatar: string;    // 头像
}

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab1Page {
  // 求助大卡片的小卡片数据（新增cardImage，对应“花、药”）
  requestList: CardItem[] = [
    {
      id: 'req-1',
      cardImage: 'flower',       // 对应手绘图的“花”
      icon: 'navigate-outline',  // 距离旁的小图标
      distance: '1.0km',
      name: '刘xx',
      address: '广科大小区',
      demand: '有一些花需要浇水',
      price: '10.00¥',
      avatar: 'person-circle'
    },
    {
      id: 'req-2',
      cardImage: 'medkit',       // 对应手绘图的“药”
      icon: 'navigate-outline',
      distance: '78m',
      name: '李xx',
      address: '广科大小区',
      demand: '需要跑腿买药',
      price: '5.00¥',
      avatar: 'person-circle'
    }
  ];

  // 帮助大卡片的小卡片数据（新增cardImage，对应“家电、打扫”）
  helpList: CardItem[] = [
    {
      id: 'help-1',
      cardImage: 'build',        // 对应手绘图的“家电”
      icon: 'navigate-outline',
      distance: '500m',
      name: '刘xx',
      address: '广科大小区',
      demand: '可以修理家电',
      price: '50.00¥',
      avatar: 'person-circle'
    },
    {
      id: 'help-2',
      cardImage: 'trash',        // 对应手绘图的“打扫”
      icon: 'navigate-outline',
      distance: '200m',
      name: '李xx',
      address: '广科大小区',
      demand: '可以打扫卫生',
      price: '100.00¥',
      avatar: 'person-circle'
    }
  ];

  private searchKeyword = '';

  constructor() {}

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchKeyword = input.value.trim().toLowerCase();
  }

  onSearchKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.executeSearch();
    }
  }

  onSearchClick() {
    this.executeSearch();
  }

  private executeSearch() {
    if (!this.searchKeyword) {
      this.resetCardList();
      return;
    }

    this.requestList = this.requestList.filter(item => 
      item.name.toLowerCase().includes(this.searchKeyword) ||
      item.address.toLowerCase().includes(this.searchKeyword) ||
      item.demand.toLowerCase().includes(this.searchKeyword)
    );

    this.helpList = this.helpList.filter(item => 
      item.name.toLowerCase().includes(this.searchKeyword) ||
      item.address.toLowerCase().includes(this.searchKeyword) ||
      item.demand.toLowerCase().includes(this.searchKeyword)
    );
  }

  private resetCardList() {
    this.requestList = [
      {
        id: 'req-1',
        cardImage: 'flower',
        icon: 'navigate-outline',
        distance: '1.0km',
        name: '刘xx',
        address: '广科大小区',
        demand: '有一些花需要浇水',
        price: '10.00¥',
        avatar: 'person-circle'
      },
      {
        id: 'req-2',
        cardImage: 'medkit',
        icon: 'navigate-outline',
        distance: '78m',
        name: '李xx',
        address: '广科大小区',
        demand: '需要跑腿买药',
        price: '5.00¥',
        avatar: 'person-circle'
      }
    ];

    this.helpList = [
      {
        id: 'help-1',
        cardImage: 'build',
        icon: 'navigate-outline',
        distance: '500m',
        name: '刘xx',
        address: '广科大小区',
        demand: '可以修理家电',
        price: '50.00¥',
        avatar: 'person-circle'
      },
      {
        id: 'help-2',
        cardImage: 'trash',
        icon: 'navigate-outline',
        distance: '200m',
        name: '李xx',
        address: '广科大小区',
        demand: '可以打扫卫生',
        price: '100.00¥',
        avatar: 'person-circle'
      }
    ];
  }

  onBigCardMoreClick(type: 'request' | 'help') {
    console.log(`点击了【${type === 'request' ? '求助' : '帮助'}】大卡片的更多按钮`);
  }

  trackById(index: number, item: CardItem): string {
    return item.id;
  }
}