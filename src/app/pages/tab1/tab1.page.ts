/* src/app/tab1/tab1.page.ts（修复版） */
import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map, firstValueFrom } from 'rxjs';
import { ShowEventComponent } from '../../components/show-event/show-event.component';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import {
  getUserPosition,
  calculateDistance,
  formatDistance,
  resolveAddress,
  isOnlineService,
} from '../../components/show-event/show-event.component';
import { LanguageService } from '../../services/language.service';
import { DynamicTranslationService } from '../../services/dynamic-translation.service';
import { mapApiCardToEventCardData } from '../../utils/event-card.mapper';

// 卡片数据接口
interface CardItem {
  id: string;
  creatorId: number;
  cardImage: string;
  distance: string;
  name: string;
  address: string;
  demand: string;
  price: string;
  avatar: string;
  createTime: string;
  title: string;
  lng?: number | null;
  lat?: number | null;
}

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ShowEventComponent],
})
export class Tab1Page implements OnInit {
  private readonly API_BASE = environment.apiBase;
  private http = inject(HttpClient);
  private router = inject(Router);
  private langService = inject(LanguageService);
  private dynTrans = inject(DynamicTranslationService);

  // --- 原有功能变量 ---
  requestList: CardItem[] = [];
  helpList: CardItem[] = [];
  eventData: CardItem[] = [];
  showLangConfirmModal = false;
  t = this.langService.getTranslations('zh').tab1;

  // --- 翻译与适老化功能变量 ---
  public dynamicSourceText: string = '你好，这是测试翻译的文本';
  public translatedText: string = '';
  public sourceLang: string = 'zh';
  public targetLang: string = 'en';
  public isElderlyMode: boolean = false; // 长辈模式开关

  get currentLangBtnText() {
    return this.t.btnText;
  }

  ngOnInit() {
    const savedElderly = localStorage.getItem('elderly_mode');
    if (savedElderly === 'true') {
      this.isElderlyMode = true;
      document.body.classList.add('elderly-mode');
    } else {
      this.isElderlyMode = document.body.classList.contains('elderly-mode');
    }
    let isFirstEmit = true;
    // 语言监听：切换语言时重新拉取数据（服务端根据 ?lang= 返回译文）
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).tab1;
      if (isFirstEmit) {
        isFirstEmit = false;
        return;
      }
      this.loadCardLists();
    });

    this.loadCardLists();
  }

  ionViewWillEnter() {
    this.loadCardLists();
  }

  private async loadCardLists() {
    // 并发加载两种类型
    const [reqList, helpList] = await Promise.all([
      firstValueFrom(this.getCardData('request')),
      firstValueFrom(this.getCardData('help')),
    ]);
    this.requestList = reqList || [];
    this.helpList = helpList || [];
    this.eventData = [...this.requestList, ...this.helpList];

    // 计算真实距离
    await this.updateCardDistances();

    // 触发动态文本翻译（管道已注册文本，此处批量调用API）
    setTimeout(() => this.dynTrans.translateAll().subscribe(), 200);
  }

  private updateEventData() {
    this.eventData = [...this.requestList, ...this.helpList];
  }

  private getCardData(type: 'request' | 'help') {
    return this.http.get<any[]>(`${this.API_BASE}/api/cards?type=${type}`).pipe(
      map((rawData) => {
        const processedData = rawData.map((item: any) => ({
          ...mapApiCardToEventCardData(item),
          icon: 'navigate-outline',
          distance: this.t.unknownDistance,
          tags: item.tags || '',
        }));
        let finalData = processedData;
        if (processedData.length > 4) {
          finalData = this.shuffleArray(processedData).slice(0, 4);
        }
        return finalData;
      }),
    );
  }

  // 所有卡片加载完后统一计算真实距离
  private async updateCardDistances() {
    const userPos = await getUserPosition();
    if (!userPos) return;

    for (const card of this.eventData) {
      // 线上服务不显示距离
      if (isOnlineService(card.address)) {
        card.distance = '';
        continue;
      }

      if (card.lng != null && card.lat != null) {
        const meters = calculateDistance(
          userPos.lng,
          userPos.lat,
          card.lng,
          card.lat,
        );
        card.distance = formatDistance(
          meters,
          this.langService.getCurrentLang(),
        );
      } else if (card.address) {
        const coords = await resolveAddress(card.address);
        if (coords) {
          card.lng = coords.lng;
          card.lat = coords.lat;
          const meters = calculateDistance(
            userPos.lng,
            userPos.lat,
            coords.lng,
            coords.lat,
          );
          card.distance = formatDistance(
            meters,
            this.langService.getCurrentLang(),
          );
        }
      }
    }
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

  confirmSwitchLanguage() {
    this.handleStaticTranslate();
    this.handleDynamicTranslate();
    this.showLangConfirmModal = false;
  }

  cancelSwitchLanguage() {
    this.showLangConfirmModal = false;
  }

  toggleElderlyMode() {
    this.isElderlyMode = !this.isElderlyMode;
    if (this.isElderlyMode) {
      document.body.classList.add('elderly-mode');
    } else {
      document.body.classList.remove('elderly-mode');
    }
    localStorage.setItem('elderly_mode', String(this.isElderlyMode));
  }

  cardClickFeedback(item: CardItem) {
    (document.activeElement as HTMLElement)?.blur();
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

  trackById(_index: number, item: CardItem): string {
    return item.id;
  }

  // 翻译按钮 - 切换整个项目的中英文
  public onTranslateBtnClick(): void {
    this.showLangConfirmModal = true;
  }

  toggleLanguage() {
    this.showLangConfirmModal = true;
  }

  // 静态翻译：切换整个应用的 UI 语言
  private handleStaticTranslate(): void {
    this.langService.toggleLanguage();
  }

  // 动态翻译由 DynamicTranslationService 自动触发，此处仅做日志
  private handleDynamicTranslate(): void {
    console.log('语言已切换，动态翻译服务自动运行中...');
  }
}
