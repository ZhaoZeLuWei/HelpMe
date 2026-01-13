import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { ShowEventComponent } from '../show-event/show-event.component';

// 卡片数据接口
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
  imports: [
    IonicModule,
    CommonModule,
    ShowEventComponent,
    HttpClientModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab1Page implements OnInit {
  requestList: CardItem[] = []; 
  helpList: CardItem[] = [];    
  private searchKeyword = '';
  currentLang = '中文';
  showLangConfirmModal = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.getCardData('request').subscribe(data => {
      this.requestList = data;
    });
    this.getCardData('help').subscribe(data => {
      this.helpList = data;
    });
  }

  // 封装：请求卡片数据 + 随机显示4个逻辑
  private getCardData(type: 'request' | 'help') {
    return this.http.get<any[]>(`http://localhost:3000/api/cards?type=${type}`).pipe(
      map(rawData => {
        // 1. 基础数据处理：格式化字段
        const processedData = rawData.map(item => ({
          ...item,
          icon: 'navigate-outline',
          distance: '距500m',
          price: item.price ? item.price.toString() : '0.00元' 
        }));

        let finalData = processedData;

        // 如果数据库返回的数据超过4个，则进行随机截取
        if (processedData.length > 4) {
          finalData = this.shuffleArray(processedData).slice(0, 4);
        }

        return finalData;
      })
    );
  }
  //随机打乱数组
  shuffleArray(array: any[]): any[] {
    let currentIndex = array.length;
    let randomIndex;
  
    const newArray = [...array];

    // 当还剩有元素未洗牌时
    while (currentIndex != 0) {
      // 选取一个剩余元素
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      
      // 交换它与当前元素
      [newArray[currentIndex], newArray[randomIndex]] = [
        newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
  }

  // 搜索输入事件
  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchKeyword = input.value.trim().toLowerCase();
  }

  // 回车触发搜索
  onSearchKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.executeSearch();
    }
  }

  // 点击搜索按钮
  onSearchClick() {
    this.executeSearch();
  }

  // 切换语言
  toggleLanguage() {
    this.showLangConfirmModal = true;
  }

  // 确认切换语言
  confirmSwitchLanguage() {
    this.currentLang = this.currentLang === '中文' ? 'EN' : '中文';
    this.showLangConfirmModal = false;
  }

  // 取消切换语言
  cancelSwitchLanguage() {
    this.showLangConfirmModal = false;
  }

  // 执行搜索逻辑
  private executeSearch() {
    if (!this.searchKeyword) {

      this.getCardData('request').subscribe(data => this.requestList = data);
      this.getCardData('help').subscribe(data => this.helpList = data);

      return;
    }

    // 过滤现有数据
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

  // 卡片点击反馈
  cardClickFeedback(item: CardItem) {
    console.log('点击了小卡片：', item.name, 'ID：', item.id);
  }

  // 更多按钮点击
  onBigCardMoreClick(type: 'request' | 'help') {
    console.log(`点击了【${type === 'request' ? '求助' : '帮助'}】大卡片的更多按钮`);
  }

  // 列表跟踪标识
  trackById(index: number, item: CardItem): string {
    return item.id;
  }
}