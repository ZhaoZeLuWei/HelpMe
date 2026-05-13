import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonSearchbar, IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';  // 添加这行
import { SearchStateService } from '../../services/search-state.service';
import { AiService } from '../../services/ai.service';
import { HttpClientModule } from '@angular/common/http';

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
    IonButton,    // ← 已有
    IonSearchbar, // 如果模板里用到也加上
    IonIcon,      // ← 添加IonIcon
  ],
})
export class SearchPage implements OnInit {
  private searchState = inject(SearchStateService);
  private aiService = inject(AiService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private location = inject(Location);
  private route = inject(ActivatedRoute);

  keyword = '';
  returnTo = '';

  ngOnInit() {
    this.returnTo = this.route.snapshot.queryParams['returnTo'] || 'tabs/tab2';
  }

  onSearch() {
    const kw = this.keyword.trim();
    // 直接把关键词带回 Tab2（不再写全局 service）
    this.router.navigate(['/tabs/tab2'], {
      queryParams: { search: kw }   // 只传关键词，不存 service 也可
    });
  }

  goBack() {
    // 尝试返回上一页，如果没有历史则回首页
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/tabs/tab1']);
    }
  }

  async aiSearch() {
    const kw = this.keyword.trim();
    if (!kw) {
      return;
    }

    // 调用 AI 增强搜索
    const result = await this.aiService.enhanceSearch(kw);

    if (result) {
      // 存储 AI 结果到共享状态
      this.searchState.setAiResults({
        keyword: kw,
        recommendation: result.recommendation,
        matchedEvents: result.matchedEvents,
        matchedProviders: result.matchedProviders,
      });

      // 导航到 Tab2，带 AI 标记
      this.router.navigate(['/tabs/tab2'], {
        queryParams: { search: kw, ai: '1' },
      });
    } else {
      // AI 搜索失败，回退到普通搜索
      this.onSearch();
    }
  }
}
