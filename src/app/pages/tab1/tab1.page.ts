/* src/app/tab1/tab1.page.ts */
import {
  Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject,
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
  imports: [IonicModule, CommonModule, ShowEventComponent, HttpClientModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Tab1Page implements OnInit {
  private readonly API_BASE = environment.apiBase;
  private http = inject(HttpClient);
  private router = inject(Router);
  private langService = inject(LanguageService);
  private translateService = inject(TranslateService);

  requestList: CardItem[] = [];
  helpList: CardItem[] = [];
  eventData: CardItem[] = [];
  showLangConfirmModal = false;
  t = this.langService.getTranslations('zh').tab1;

  dynamicSourceText = '你好，这是测试翻译的文本';
  translatedText = '';
  sourceLang = 'zh';
  targetLang = 'en';

  get currentLangBtnText() {
    return this.t.btnText;
  }

  ngOnInit() {
    this.loadCardLists();

    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).tab1;
    });
  }

  ionViewWillEnter() {
    this.loadCardLists();
  }

  private loadCardLists() {
    this.getCardData('request').subscribe(data => {
      this.requestList = data;
      this.updateEventData();
    });
    this.getCardData('help').subscribe(data => {
      this.helpList = data;
      this.updateEventData();
    });
  }

  private updateEventData() {
    this.eventData = [...this.requestList, ...this.helpList];
  }

  private getCardData(type: 'request' | 'help') {
    const lang = this.langService.getCurrentLang();
    return this.http.get<any[]>(`${this.API_BASE}/api/cards?type=${type}&lang=${lang}`).pipe(
      map(rawData => {
        const processed = rawData.map(item => ({
          ...item,
          icon: 'navigate-outline',
          distance: '距500m',
          price: item.price ? item.price.toString() : '0.00元',
        }));
        let final = processed;
        if (processed.length > 4) {
          final = this.shuffleArray(processed).slice(0, 4);
        }
        return final;
      })
    );
  }

  shuffleArray(array: any[]): any[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  goToSearchPage() {
    this.router.navigate(['/search'], { queryParams: { returnTo: 'tabs/tab2' } });
  }

  goToTab2Search(type?: 'request' | 'help') {
    this.router.navigate(['/tabs/tab2'], { queryParams: { type } });
  }

  toggleLanguage() {
    this.showLangConfirmModal = true;
  }

  confirmSwitchLanguage() {
    this.langService.toggleLanguage();
    this.showLangConfirmModal = false;
    this.loadCardLists();
  }

  cancelSwitchLanguage() {
    this.showLangConfirmModal = false;
  }

  cardClickFeedback(item: CardItem) {
    this.router.navigate(['/particular'], {
      queryParams: { eventId: item.id, returnTo: '/tabs/tab1' },
    });
  }

  trackById(index: number, item: CardItem): string {
    return item.id;
  }

  public onTranslateBtnClick(): void {
    this.handleStaticTranslate();
    this.handleDynamicTranslate();
  }

  private handleStaticTranslate(): void {
    console.log('静态文本翻译已执行');
  }

  private handleDynamicTranslate(): void {
    if (!this.dynamicSourceText.trim()) {
      console.warn('无待翻译的动态文本');
      return;
    }

    this.translateService
      .translateText({
        sourceText: this.dynamicSourceText,
        sourceLang: this.sourceLang,
        targetLang: this.targetLang,
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.translatedText = res.targetText;
            console.log('翻译成功，结果：', this.translatedText);
            alert('翻译成功：' + this.translatedText);
          }
        },
        error: (err) => {
          console.error('翻译失败', err);
          alert('翻译失败，请检查后端服务是否启动');
        },
      });
  }

  public toggleTranslateLanguage(): void {
    [this.sourceLang, this.targetLang] = [this.targetLang, this.sourceLang];
  }
}
