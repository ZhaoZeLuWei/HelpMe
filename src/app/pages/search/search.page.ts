import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, IonSearchbar } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SearchStateService } from '../../services/search-state.service'; // 根据实际路径调整
import { EventCardData } from '../../components/show-event/show-event.component'; // 根据实际路径调整
import { environment } from '../../../environments/environment';
import { HttpClientModule } from '@angular/common/http'; // ← 新增

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
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,   // ← 必须加
    IonButton,    // ← 已有
    IonSearchbar, // 如果模板里用到也加上
  ],
})
export class SearchPage implements OnInit {
  private searchState = inject(SearchStateService);
  private router = inject(Router);
  private http = inject(HttpClient);
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

  onCancel() {
    this.searchState.clear();
    this.router.navigateByUrl(this.returnTo);
  }
}
