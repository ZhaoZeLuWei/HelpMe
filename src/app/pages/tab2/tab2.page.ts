import {
  Component,
  OnInit,
  inject,
  signal,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { ActivatedRoute, Router } from '@angular/router'; // 添加 ActivatedRoute 和 Router 导入

// 引入搜索组件 (用于显示搜索结果)
import {
  UniversalSearchComponent,
  EventCardData,
} from '../../components/universal-search/universal-search.component';

// 引入展示组件
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
    IonSearchbar,
    UniversalSearchComponent,
    ShowEventComponent,
  ],
})
export class Tab2Page implements OnInit, AfterViewInit {
  private readonly API_BASE = environment.apiBase;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private searchState = inject(SearchStateService);

  // 数据容器
  eventsData = signal<EventCardData[]>([]);

  // 分类参数
  currentType: string | null = null;

  // 拿到搜索框实例
  @ViewChild('searchBar') searchBar!: IonSearchbar;

  //constructor(private route: ActivatedRoute) {}

  ngOnInit() {    // 统一订阅：关键词变化 or 聚焦标志变化都走这里
    // 接收路由参数
    this.route.queryParams.subscribe(params => {
      this.currentType = params['type'] || null;
      const keyword = params['search'] || '';

      // 只在第一次或者关键词变化时加载数据
      const currentKeyword = this.route.snapshot.queryParams['search'] || '';
      if (keyword !== currentKeyword || !this.eventsData().length) {
        this.loadEvents(keyword);          // 把关键词传进去
      }

      // 聚焦逻辑（可选）
      if (params['focusSearch']) {
        setTimeout(() => this.searchBar?.setFocus(), 300);
      }
    });
  }

  // 每次重新进入页面时刷新数据，确保发布/删除后的内容立刻可见
  ionViewWillEnter() {
    this.loadEvents();
  }

  ngAfterViewInit() {
    // 如果 URL 带 focusSearch=true，则自动聚焦搜索框
    this.route.queryParams.subscribe((params) => {
      if (params['focusSearch']) {
        setTimeout(() => this.searchBar?.setFocus(), 300);
      }
    });
  }

  /* 统一加载：根据关键词和分类决定接口 */
  private loadEvents(keyword?: string, skipUpdate?: boolean) {
    // 直接从当前路由获取参数，而不是使用保存的 this.currentType
    const currentParams = this.route.snapshot.queryParams;
    const realType = currentParams['type'] || null;

    // 构建查询参数
    const params = new URLSearchParams();
    if (keyword) {
      params.append('search', encodeURIComponent(keyword));
    }
    if (realType) {
      params.append('type', realType);
    }

    // 构建URL
    const url = `${this.API_BASE}/api/cards${params.toString() ? '?' + params.toString() : ''}`;

    fetch(url)
      .then(res => res.json())
      .then(list => {
        const transformed = list.map((item: any) => ({
          id: String(item.id),
          creatorId: Number(item.creatorId), // 新增
          cardImage: item.cardImage ,
          title: item.title,
          icon: item.icon || 'navigate-outline',
          distance: item.distance || '未知距离',
          name: item.name,
          address: item.address,
          demand: item.demand,
          price: item.price ? String(item.price) : '0.00',
          createTime: item.createTime,
          avatar: item.avatar,
        }));

        this.eventsData.set(transformed);   // signal 自动触发视图更新
      })
      .catch(err => console.error('Tab2 加载失败', err));
  }
  /* 跳转到搜索页面 */
  navigateToSearch() {
    this.router.navigate(['/search'], {
      queryParams: { returnTo: 'tabs/tab2' }
    });
  }
}
