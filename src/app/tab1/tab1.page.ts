import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular'; 
import { CommonModule } from '@angular/common'; 

// 导入新创建的子组件
import { ShowEventComponent } from '../show-event/show-event.component';

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
  imports: [IonicModule, CommonModule, ShowEventComponent], 
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab1Page {
  //求助列表 
  private readonly ORIGINAL_REQUESTS: CardItem[] = [
    {
      id: 'req-1',
      cardImage: 'https://picsum.photos/seed/flower/600/400',
      icon: 'navigate-outline',
      distance: '距1.0km',
      name: '刘xx',
      address: '广科小区',
      demand: '有一些花需要浇水',
      price: '10.80元',
      avatar: 'person-circle-outline'
    },
    {
      id: 'req-2',
      cardImage: 'https://picsum.photos/seed/medicine/600/400',
      icon: 'navigate-outline',
      distance: '距7.8m',
      name: '李xx',
      address: '涂料小区',
      demand: '需要跑腿买药',
      price: '5.00元',
      avatar: 'person-circle-outline'
    },
    {
      id: 'req-3',
      cardImage: 'https://picsum.photos/seed/rice/600/400',
      icon: 'navigate-outline',
      distance: '距300m',
      name: '王xx',
      address: '幸福家园',
      demand: '帮忙提两袋米上楼',
      price: '15.00元',
      avatar: 'person-circle-outline'
    },
    {
      id: 'req-4',
      cardImage: 'https://picsum.photos/seed/smartphone/600/400',
      icon: 'navigate-outline',
      distance: '距1.2km',
      name: '张xx',
      address: '广科小区',
      demand: '手机连不上网，教一下',
      price: '0.00元',
      avatar: 'person-circle-outline'
    }
  ];

  // 帮助列表 
  private readonly ORIGINAL_HELPS: CardItem[] = [
    {
      id: 'help-1',
      cardImage: 'https://picsum.photos/seed/tools/600/400',
      icon: 'navigate-outline',
      distance: '距500m',
      name: '刘xx',
      address: '涂料小区',
      demand: '可以修理家电',
      price: '0.00元',
      avatar: 'person-circle-outline'
    },
    {
      id: 'help-2',
      cardImage: 'https://picsum.photos/seed/cleaning/600/400',
      icon: 'navigate-outline',
      distance: '距2.0km',
      name: '李xx',
      address: '涂料小区',
      demand: '可以打扫卫生',
      price: '100.00元',
      avatar: 'person-circle-outline'
    },
    {
      id: 'help-3',
      cardImage: 'https://picsum.photos/seed/sewing/600/400',
      icon: 'navigate-outline',
      distance: '距800m',
      name: '赵奶奶',
      address: '广科小区',
      demand: '擅长缝补衣服、改裤脚',
      price: '5.00元',
      avatar: 'person-circle-outline'
    },
    {
      id: 'help-4',
      cardImage: 'https://picsum.photos/seed/dumpling/600/400',
      icon: 'navigate-outline',
      distance: '距50m',
      name: '孙大爷',
      address: '幸福家园',
      demand: '现做手工水饺，味道好',
      price: '30.00元',
      avatar: 'person-circle-outline'
    }
  ];

  requestList: CardItem[] = [];
  helpList: CardItem[] = [];
  private searchKeyword = '';
  
  // 语言变量
  currentLang = '中文';
  
  // 控制自定义弹窗显示的变量
  showLangConfirmModal = false;

  constructor() {
    this.resetCardList();
  }

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

  //自定义弹窗相关的方法
  toggleLanguage() {
    this.showLangConfirmModal = true;
  }

  confirmSwitchLanguage() {
    this.currentLang = this.currentLang === '中文' ? 'EN' : '中文';
    console.log('语言切换为:', this.currentLang);
    this.showLangConfirmModal = false;
  }

  cancelSwitchLanguage() {
    this.showLangConfirmModal = false;
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

  // 处理子组件传来的点击事件
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