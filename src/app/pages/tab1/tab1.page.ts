/* src/app/tab1/tab1.page.ts（修复版） */
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  inject,
} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { ShowEventComponent } from '../../components/show-event/show-event.component';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { LanguageService } from '../../services/language.service';
import { TranslateService } from '../../services/translate.service';

// 卡片数据接口
interface CardItem {
  id: string;
  creatorId: number;
  cardImage: string;
  icon: string;
  distance: string;
  name: string;
  address: string;
  demand: string;
  price: string;
  avatar: string;
  createTime: string;
  title: string;
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
    HttpClientModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Tab1Page implements OnInit {
  private readonly API_BASE = environment.apiBase;
  private http = inject(HttpClient);
  private router = inject(Router);
  private langService = inject(LanguageService);
  private translateService = inject(TranslateService);

  // --- 原有功能变量 ---
  requestList: CardItem[] = [];
  helpList: CardItem[] = [];
  eventData: CardItem[] = [];
  private searchKeyword = '';
  currentLang = '中文';
  showLangConfirmModal = false;
  t = this.langService.getTranslations('zh').tab1;

  // --- 翻译功能变量 ---
  public dynamicSourceText: string = '你好，这是测试翻译的文本'; // 直接写死测试文本，避免空值
  public translatedText: string = '';
  public sourceLang: string = 'zh';
  public targetLang: string = 'en';

  get currentLangBtnText() {
    return this.t.btnText;
  }

  ngOnInit() {
    // 原有卡片加载逻辑
    this.getCardData('request').subscribe((data) => {
      this.requestList = data;
      this.updateEventData();
    });
    this.getCardData('help').subscribe((data) => {
      this.helpList = data;
      this.updateEventData();
    });

    // 语言监听
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).tab1;
    });

    // 【关键】注释掉报错的动态文本加载
    // this.loadDynamicText();
  }

  ionViewWillEnter() {
    this.loadCardLists();
  }

  private loadCardLists() {
    this.getCardData('request').subscribe((data) => {
      this.requestList = data;
      this.updateEventData();
    });
    this.getCardData('help').subscribe((data) => {
      this.helpList = data;
      this.updateEventData();
    });
  }

  private updateEventData() {
    this.eventData = [...this.requestList, ...this.helpList];
  }

  private getCardData(type: 'request' | 'help') {
    return this.http.get<any[]>(`${this.API_BASE}/api/cards?type=${type}`).pipe(
      map((rawData) => {
        const processedData = rawData.map((item) => ({
          ...item,
          icon: 'navigate-outline',
          distance: '距500m',
          price: item.price ? item.price.toString() : '0.00元',
        }));
        let finalData = processedData;
        if (processedData.length > 4) {
          finalData = this.shuffleArray(processedData).slice(0, 4);
        }
        return finalData;
      }),
    );
  }

  shuffleArray(array: any[]): any[] {
    let currentIndex = array.length;
    let randomIndex;
    const newArray = [...array];
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [newArray[currentIndex], newArray[randomIndex]] = [
        newArray[randomIndex],
        newArray[currentIndex],
      ];
    }
    return newArray;
  }

  goToSearchPage() {
    this.router.navigate(['/search'], {
      queryParams: { returnTo: 'tabs/tab2' },
    });
  }

  goToTab2Search(type?: 'request' | 'help') {
    this.router.navigate(['/tabs/tab2'], {
      queryParams: { type: type },
    });
  }

  toggleLanguage() {
    this.showLangConfirmModal = true;
  }

  confirmSwitchLanguage() {
    this.langService.toggleLanguage();
    this.showLangConfirmModal = false;
  }

  cancelSwitchLanguage() {
    this.showLangConfirmModal = false;
  }

  cardClickFeedback(item: CardItem) {
    console.log('点击了小卡片：', item.name, 'ID：', item.id);
    this.router.navigate(['/particular'], {
      queryParams: {
        eventId: item.id,
        returnTo: '/tabs/tab1',
      },
    });
  }

  onBigCardMoreClick(type: 'request' | 'help') {
    console.log(
      `点击了【${type === 'request' ? '求助' : '帮助'}】大卡片的更多按钮`,
    );
  }

  trackById(index: number, item: CardItem): string {
    return item.id;
  }


  // 绑定你原有的翻译按钮
  public onTranslateBtnClick(): void {
    this.handleStaticTranslate();
    this.handleDynamicTranslate();
  }

  // 你的静态翻译逻辑
  private handleStaticTranslate(): void {
    console.log('静态文本翻译已执行');
    // 在此处粘贴你已完成的静态翻译代码
  }

  // 动态文本翻译 - 调用后端接口
  private handleDynamicTranslate(): void {
    if (!this.dynamicSourceText.trim()) {
      console.warn('无待翻译的动态文本');
      return;
    }

    this.translateService.translateText({
      sourceText: this.dynamicSourceText,
      sourceLang: this.sourceLang,
      targetLang: this.targetLang
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.translatedText = res.targetText;
          console.log('✅ 翻译成功，结果：', this.translatedText);
          alert('翻译成功：' + this.translatedText); // 弹窗提示，方便测试
        }
      },
      error: (err) => {
        console.error('❌ 翻译失败', err);
        alert('翻译失败，请检查后端服务是否启动');
      }
    });
  }


  public toggleTranslateLanguage(): void {
    [this.sourceLang, this.targetLang] = [this.targetLang, this.sourceLang];
  }
}