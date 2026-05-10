import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonSearchbar, IonIcon } from '@ionic/angular/standalone';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { SearchStateService } from '../../services/search-state.service';
import { HttpClientModule } from '@angular/common/http';
import { LanguageService } from '../../services/language.service';

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
  private router = inject(Router);
  private http = inject(HttpClient);
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private langService = inject(LanguageService);

  keyword = '';
  returnTo = '';
  t = this.langService.getTranslations('zh').search;

  ngOnInit() {
    this.returnTo = this.route.snapshot.queryParams['returnTo'] || 'tabs/tab2';

    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).search;
    });
  }

  onSearch() {
    const kw = this.keyword.trim();
    this.router.navigate(['/tabs/tab2'], {
      queryParams: { search: kw },
    });
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/tabs/tab1']);
    }
  }

  aiSearch() {
    console.log('AI辅助搜索功能暂未开发');
  }
}
