import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonSearchbar, IonIcon } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { SearchStateService } from '../../services/search-state.service';
import { AiService } from '../../services/ai.service';
import { HttpClientModule } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { searchOutline, sparklesOutline, chevronBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    IonHeader,
    IonContent,
    IonButton,
    IonSearchbar,
    IonIcon,
  ],
})
export class SearchPage implements OnInit {
  private searchState = inject(SearchStateService);
  private aiService = inject(AiService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);

  keyword = '';
  returnTo = '';
  aiSearching = false;

  constructor() {
    addIcons({ searchOutline, sparklesOutline, chevronBackOutline });
  }

  ngOnInit() {
    this.returnTo = this.route.snapshot.queryParams['returnTo'] || 'tabs/tab2';
  }

  onSearch() {
    const kw = this.keyword.trim();
    this.router.navigate(['/tabs/tab2'], {
      queryParams: { search: kw }
    });
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
        message: '请输入搜索关键词',
        duration: 1500,
        position: 'bottom',
      });
      await toast.present();
      return;
    }

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
        // AI 失败，回退到普通搜索
        const toast = await this.toastCtrl.create({
          message: 'AI 搜索暂不可用，使用普通搜索结果',
          duration: 1500,
          position: 'bottom',
        });
        await toast.present();
        this.onSearch();
      }
    } catch {
      const toast = await this.toastCtrl.create({
        message: '搜索出错，请重试',
        duration: 1500,
        position: 'bottom',
      });
      await toast.present();
      this.onSearch();
    } finally {
      this.aiSearching = false;
    }
  }
}
