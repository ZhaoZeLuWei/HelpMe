import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular'; 
import { CommonModule } from '@angular/common'; 

// 小卡片类型定义
interface CardItem {
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
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab1Page {
  // 求助大卡片的小卡片数据
  requestList: CardItem[] = [
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

  // 帮助大卡片的小卡片数据
  helpList: CardItem[] = [
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

  // 所有小卡片点击反馈（仅打印日志）
  cardClickFeedback(item: CardItem) {
    console.log('点击了小卡片：', item.name, 'ID：', item.id);
  }

  onBigCardMoreClick(type: 'request' | 'help') {
    console.log(`点击了【${type === 'request' ? '求助' : '帮助'}】大卡片的更多按钮`);
  }

  trackById(index: number, item: CardItem): string {
    return item.id;
  }
}