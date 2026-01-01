import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular'; 
import { CommonModule } from '@angular/common'; 

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
  // 原始数据常量
  private readonly ORIGINAL_REQUESTS: CardItem[] = [
    {
      id: 'req-1',
      cardImage: 'flower-outline',
      icon: 'locate-outline',
      distance: '距1.0km',
      name: '刘xx',
      address: '广科小区',
      demand: '有一些花需要浇水',
      price: '10.80元',
      avatar: 'person-circle-outline'
    },
    {
      id: 'req-2',
      cardImage: 'medkit-outline',
      icon: 'locate-outline',
      distance: '距7.8m',
      name: '李xx',
      address: '涂料小区',
      demand: '需要跑腿买药',
      price: '5.00元',
      avatar: 'person-circle-outline'
    }
  ];

  private readonly ORIGINAL_HELPS: CardItem[] = [
    {
      id: 'help-1',
      cardImage: 'construct-outline',
      icon: 'locate-outline',
      distance: '距500m',
      name: '刘xx',
      address: '涂料小区',
      demand: '可以修理家电',
      price: '0.00元',
      avatar: 'person-circle-outline'
    },
    {
      id: 'help-2',
      cardImage: 'sparkles-outline',
      icon: 'locate-outline',
      distance: '距2.0km',
      name: '李xx',
      address: '涂料小区',
      demand: '可以打扫卫生',
      price: '100.00元',
      avatar: 'person-circle-outline'
    }
  ];

  // 当前显示的数据（用于渲染视图）
  requestList: CardItem[] = [];
  helpList: CardItem[] = [];

  private searchKeyword = '';

  constructor() {
    this.resetCardList();
  }

  // 监听输入框事件（不使用 ngModel）
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

    this.requestList = this.ORIGINAL_REQUESTS.filter(item => 
      item.name.toLowerCase().includes(this.searchKeyword) ||
      item.address.toLowerCase().includes(this.searchKeyword) ||
      item.demand.toLowerCase().includes(this.searchKeyword)
    );

    this.helpList = this.ORIGINAL_HELPS.filter(item => 
      item.name.toLowerCase().includes(this.searchKeyword) ||
      item.address.toLowerCase().includes(this.searchKeyword) ||
      item.demand.toLowerCase().includes(this.searchKeyword)
    );
  }

  private resetCardList() {
    this.requestList = [...this.ORIGINAL_REQUESTS];
    this.helpList = [...this.ORIGINAL_HELPS];
  }

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