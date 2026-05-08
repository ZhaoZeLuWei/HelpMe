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
    this.getCardData('request').subscribe(data => {
      this.requestList = data;
      this.updateEventData();
    });
    this.getCardData('help').subscribe(data => {
      this.helpList = data;
      this.updateEventData();
    });

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
    this.loadCardLists();   // 重新加载数据
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
}