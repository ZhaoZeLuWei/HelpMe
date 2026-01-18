import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { map, Observable, forkJoin } from 'rxjs';
import { ShowEventComponent } from '../../components/show-event/show-event.component';
import { UniversalSearchComponent } from '../../components/universal-search/universal-search.component';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

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
    HttpClientModule, // 【修复1】这里加上了逗号
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Tab1Page implements OnInit {
  private readonly API_BASE = environment.apiBase;
  // 使用 inject() 函数替代构造函数注入
  private http = inject(HttpClient);
  private router = inject(Router);

  requestList: CardItem[] = [];
  helpList: CardItem[] = [];

  // 【修复2】在类中定义了缺失的 eventData 属性
  // 初始化为空数组，类型为 CardItem[]
  eventData: CardItem[] = [];

  private searchKeyword = '';
  currentLang = '中文';
  showLangConfirmModal = false;

  //constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.getCardData('request').subscribe((data) => {
      this.requestList = data;
      this.updateEventData(); // 更新总数据
    });
    this.getCardData('help').subscribe((data) => {
      this.helpList = data;
      this.updateEventData(); // 更新总数据
    });
  }

  // 新增辅助方法：合并 request 和 help 数据，供搜索组件使用
  private updateEventData() {
    this.eventData = [...this.requestList, ...this.helpList];
  }

  // 封装：请求卡片数据 + 随机显示4个逻辑
  private getCardData(type: 'request' | 'help') {
    return this.http.get<any[]>(`${this.API_BASE}/api/cards?type=${type}`).pipe(
      map((rawData) => {
        // 1. 基础数据处理：格式化字段
        const processedData = rawData.map((item) => ({
          ...item,
          icon: 'navigate-outline',
          distance: '距500m',
          price: item.price ? item.price.toString() : '0.00元',
        }));

        let finalData = processedData;

        // 如果数据库返回的数据超过4个，则进行随机截取
        if (processedData.length > 4) {
          finalData = this.shuffleArray(processedData).slice(0, 4);
        }

        return finalData;
      }),
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
        newArray[randomIndex],
        newArray[currentIndex],
      ];
    }
    return newArray;
  }

  //去到搜索页面,并且搜索框自动聚焦
  goToSearchPage() {
    this.router.navigate(['/tabs/tab2'], { queryParams: { focusSearch: true } });
  }
  //只去到搜索页面
  goToTab2Search() {
    this.router.navigate(['/tabs/tab2']);
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

  // 卡片点击反馈
  cardClickFeedback(item: CardItem) {
    console.log('点击了小卡片：', item.name, 'ID：', item.id);
  }

  // 更多按钮点击
  onBigCardMoreClick(type: 'request' | 'help') {
    console.log(
      `点击了【${type === 'request' ? '求助' : '帮助'}】大卡片的更多按钮`,
    );
  }

  // 列表跟踪标识
  trackById(index: number, item: CardItem): string {
    return item.id;
  }
}
