import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { SearchStateService } from '../../services/search-state.service';
import { AiService } from '../../services/ai.service';
import { LanguageService } from '../../services/language.service';
import { environment } from '../../../environments/environment';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  sparklesOutline,
  chevronBackOutline,
  timeOutline,
  closeCircle,
  trashOutline,
  arrowForwardOutline,
  hourglassOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
})
export class SearchPage implements OnInit {
  private searchState = inject(SearchStateService);
  private aiService = inject(AiService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private langService = inject(LanguageService);

  // 翻译对象
  t = this.langService.getTranslations('zh').search;

  keyword = '';
  returnTo = '';
  aiSearching = false;
  searchHistory: string[] = [];
  private readonly HISTORY_KEY = 'search_history';
  private readonly MAX_HISTORY = 10;

  constructor() {
    addIcons({
      searchOutline,
      sparklesOutline,
      chevronBackOutline,
      timeOutline,
      closeCircle,
      trashOutline,
      arrowForwardOutline,
      hourglassOutline,
    });

    // 监听语言变化
    this.langService.currentLang$.subscribe((lang) => {
      this.t = this.langService.getTranslations(lang).search;
    });
  }

  ngOnInit() {
    this.returnTo = this.route.snapshot.queryParams['returnTo'] || 'tabs/tab2';
    this.loadHistory();
  }

  private loadHistory() {
    const stored = localStorage.getItem(this.HISTORY_KEY);
    if (stored) {
      try {
        this.searchHistory = JSON.parse(stored);
      } catch {
        this.searchHistory = [];
      }
    }
  }

  private saveHistory() {
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.searchHistory));
  }

  private addToHistory(kw: string) {
    // 去重：如果已存在，移到最前面
    const idx = this.searchHistory.indexOf(kw);
    if (idx !== -1) {
      this.searchHistory.splice(idx, 1);
    }
    this.searchHistory.unshift(kw);
    // 限制数量
    if (this.searchHistory.length > this.MAX_HISTORY) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY);
    }
    this.saveHistory();
  }

  selectHistory(kw: string) {
    this.keyword = kw;
    this.onSearch();
  }

  clearHistory() {
    this.searchHistory = [];
    localStorage.removeItem(this.HISTORY_KEY);
  }

  async onSearch() {
    const kw = this.keyword.trim();
    if (!kw) return;

    this.addToHistory(kw);
    this.aiSearching = true;
    try {
      const res = await fetch(
        `${environment.apiBase}/api/cards?search=${encodeURIComponent(kw)}`,
      );
      const list = await res.json();

      if (list && list.length > 0) {
        // 有结果，正常跳转
        this.router.navigate(['/tabs/tab2'], {
          queryParams: { search: kw },
        });
      } else {
        // 无结果，弹出确认框询问是否使用 AI 搜索
        const alert = await this.alertCtrl.create({
          header: this.t.noResults,
          message: this.t.aiSearchConfirmMsg,
          buttons: [
            { text: this.t.cancel, role: 'cancel' },
            {
              text: this.t.aiAssistSearch,
              handler: () => {
                this.executeAiSearch(kw);
              },
            },
          ],
        });
        await alert.present();
      }
    } catch {
      // API 请求失败，直接跳转
      this.router.navigate(['/tabs/tab2'], {
        queryParams: { search: kw },
      });
    } finally {
      this.aiSearching = false;
    }
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/tabs/tab1']);
    }
  }

  async aiSearch() {
    const kw = this.keyword.trim();
    if (!kw) {
      const toast = await this.toastCtrl.create({
        message: this.t.inputKeyword,
        duration: 1500,
        position: 'bottom',
      });
      await toast.present();
      return;
    }
    this.addToHistory(kw);
    await this.executeAiSearch(kw);
  }

  /** AI 搜索核心逻辑（提取出来，供普通搜索无结果后跳转复用） */
  private async executeAiSearch(kw: string) {
    this.aiSearching = true;
    try {
      const result = await this.aiService.enhanceSearch(kw);

      if (result) {
        this.searchState.setAiResults({
          keyword: kw,
          recommendation: result.recommendation,
          matchedEvents: result.matchedEvents,
          matchedProviders: result.matchedProviders,
        });

        this.router.navigate(['/tabs/tab2'], {
          queryParams: { ai: '1' },
        });
      } else {
        const toast = await this.toastCtrl.create({
          message: this.t.aiUnavailable,
          duration: 1500,
          position: 'bottom',
        });
        await toast.present();
        this.router.navigate(['/tabs/tab2'], {
          queryParams: { search: kw },
        });
      }
    } catch {
      const toast = await this.toastCtrl.create({
        message: this.t.searchError,
        duration: 1500,
        position: 'bottom',
      });
      await toast.present();
      this.router.navigate(['/tabs/tab2'], {
        queryParams: { search: kw },
      });
    } finally {
      this.aiSearching = false;
    }
  }
}
