import { Component, OnInit, inject, signal, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { ActivatedRoute } from '@angular/router';  // 添加 ActivatedRoute 导入

// 引入搜索组件 (不再依赖 UI)
import {
  UniversalSearchComponent,
  EventCardData,
} from '../../components/universal-search/universal-search.component';

// 引入展示组件 (在这里由 Tab2 接管)
import { ShowEventComponent } from '../../components/show-event/show-event.component';
import { SearchStateService } from '../../services/search-state.service';
@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    UniversalSearchComponent,
    ShowEventComponent,
  ],
})
export class Tab2Page implements OnInit, AfterViewInit {
  private readonly API_BASE = environment.apiBase;
  private route = inject(ActivatedRoute);
  private searchState = inject(SearchStateService);


  // 数据容器
  eventsData = signal<EventCardData[]>([]);

  // 拿到搜索框实例
  @ViewChild('searchBar') searchBar!: IonSearchbar;

  //constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // 统一订阅：关键词变化 or 聚焦标志变化都走这里
    this.route.queryParams.subscribe(params => {
      const keyword = params['search'] || '';
      this.loadEvents(keyword);          // 把关键词传进去

      // 聚焦逻辑（可选）
      if (params['focusSearch']) {
        setTimeout(() => this.searchBar?.setFocus(), 300);
      }
    });
  }


  ngAfterViewInit() {
    // 如果 URL 带 focusSearch=true，则自动聚焦搜索框
    this.route.queryParams.subscribe(params => {
      if (params['focusSearch']) {
        setTimeout(() => this.searchBar?.setFocus(), 300);
      }
    });
  }

  /* 统一加载：根据关键词决定接口 */
  private loadEvents(keyword?: string) {
    const url = keyword
      ? `${this.API_BASE}/api/cards?search=${encodeURIComponent(keyword)}`
      : `${this.API_BASE}/api/cards`;

    fetch(url)
      .then(res => res.json())
      .then(list => {
        const transformed = list.map((item: any) => ({   // ← 显式 any
          id: String(item.id),
          cardImage: item.cardImage || 'https://picsum.photos/seed/default/600/400',
          icon: item.icon || 'navigate-outline',
          distance: item.distance || '未知距离',
          name: item.name,
          address: item.address,
          demand: item.demand,
          price: item.price ? String(item.price) : '0.00',
          avatar: item.avatar,
        }));
        this.eventsData.set(transformed);   // signal 自动触发视图更新
      })
      .catch(err => console.error('Tab2 加载失败', err));
  }
}
