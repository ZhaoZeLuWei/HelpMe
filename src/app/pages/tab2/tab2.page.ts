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
  IonContent,
  IonSearchbar,
  IonIcon,
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { ActivatedRoute, Router } from '@angular/router';

// 引入搜索组件 (用于显示搜索结果)
import {
  UniversalSearchComponent,
  EventCardData,
} from '../../components/universal-search/universal-search.component';

// 引入展示组件
import { ShowEventComponent } from '../../components/show-event/show-event.component';
import {
  SearchStateService,
  AiSearchResults,
} from '../../services/search-state.service';
import { LanguageService } from '../../services/language.service';
import { addIcons } from 'ionicons';
import { sparklesOutline } from 'ionicons/icons';
import {
  getUserPosition,
  calculateDistance,
  formatDistance,
  resolveAddress,
  isOnlineService,
} from '../../components/show-event/show-event.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonSearchbar,
    IonIcon,
    UniversalSearchComponent,
    ShowEventComponent,
  ],
})
export class Tab2Page implements OnInit, AfterViewInit {
  private readonly API_BASE = environment.apiBase;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private searchState = inject(SearchStateService);
  private langService = inject(LanguageService);

  // 翻译对象
  t = this.langService.getTranslations('zh').tab2;

  // 数据容器
  eventsData = signal<EventCardData[]>([]);

  // 分类参数
  currentType: string | null = null;

  // AI 搜索模式标记
  isAiMode = false;

  // AI 推荐数据（快照，不依赖信号响应）
  aiRecommendation: string | null = null;
  aiKeyword: string | null = null;

  // 拿到搜索框实例
  @ViewChild('searchBar') searchBar!: IonSearchbar;

  constructor() {
    addIcons({ sparklesOutline });
  }

  ngOnInit() {
    // 监听语言变化
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).tab2;
    });

    this.route.queryParams.subscribe((params) => {
      this.currentType = params['type'] || null;

      if (params['ai'] === '1') {
        // AI 模式：从服务快照数据
        this.isAiMode = true;
        const aiData = this.searchState.aiResults();
        if (aiData) {
          this.aiRecommendation = aiData.recommendation;
          this.aiKeyword = aiData.keyword;
        }
        this.loadEvents();
      } else {
        // 非 AI 模式：普通搜索
        this.isAiMode = false;
        this.aiRecommendation = null;
        this.aiKeyword = null;
        const keyword = params['search'] || '';
        const currentKeyword = this.route.snapshot.queryParams['search'] || '';
        if (keyword !== currentKeyword || !this.eventsData().length) {
          this.loadEvents(keyword);
        }
      }

      if (params['focusSearch']) {
        setTimeout(() => this.searchBar?.setFocus(), 300);
      }
    });

    if (this.route.snapshot.queryParams['search']) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { search: null, focusSearch: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  // 每次重新进入页面时刷新数据
  ionViewWillEnter() {
    if (!this.isAiMode) {
      this.loadEvents();
    }
  }
  filterByType(type: 'request' | 'help' | null) {
    if (this.currentType === type) {
      // 再次点击相同按钮，取消筛选
      this.currentType = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { type: null },
        queryParamsHandling: 'merge',
      });
    } else {
      this.currentType = type;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { type: type },
        queryParamsHandling: 'merge',
      });
    }
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
  private async loadEvents(keyword?: string) {
    const currentParams = this.route.snapshot.queryParams;
    const realType = this.currentType || currentParams['type'] || null;

    // AI 搜索模式：使用 AI 匹配到的事件
    if (this.isAiMode) {
      const aiData = this.searchState.aiResults();
      if (aiData?.matchedEvents?.length) {
        let matched = aiData.matchedEvents;
        // 按类型过滤（如果 URL 指定了 type）
        if (realType) {
          matched = matched.filter((item: any) => {
            const t =
              item.eventType != null ? Number(item.eventType) : item.EventType;
            return t === (realType === 'help' ? 1 : 0);
          });
        }
        const transformed = matched.map((item: any) => ({
          id: String(item.id),
          creatorId: Number(item.creatorId) || 0,
          cardImage: item.cardImage || null,
          title: item.title || '',
          icon: 'navigate-outline',
          distance: this.t.unknownDistance,
          name: item.name || '',
          address: item.address || '',
          demand: item.demand || '',
          price: item.price ? String(item.price) : '0.00',
          createTime: item.createTime,
          avatar: item.avatar || '/assets/icon/user.svg',
          lng: item.lng != null ? Number(item.lng) : null,
          lat: item.lat != null ? Number(item.lat) : null,
        }));
        this.eventsData.set(transformed);
        // 计算距离
        this.calcDistances();
        return;
      }
    }

    // 普通搜索：调用后端 API
    const params = new URLSearchParams();
    if (keyword) {
      params.append('search', encodeURIComponent(keyword));
    }
    if (realType) {
      params.append('type', realType);
    }

    const url = `${this.API_BASE}/api/cards${params.toString() ? '?' + params.toString() : ''}`;

    try {
      const res = await fetch(url);
      const list = await res.json();

      const transformed = list.map((item: any) => ({
        id: String(item.id),
        creatorId: Number(item.creatorId),
        cardImage: item.cardImage,
        title: item.title,
        icon: item.icon || 'navigate-outline',
        distance: item.distance || this.t.unknownDistance,
        name: item.name,
        address: item.address,
        demand: item.demand,
        price: item.price ? String(item.price) : '0.00',
        createTime: item.createTime,
        avatar: item.avatar,
        lng: item.lng != null ? Number(item.lng) : null,
        lat: item.lat != null ? Number(item.lat) : null,
      }));

      this.eventsData.set(transformed);
      this.calcDistances();
    } catch (err) {
      console.error(this.t.loadFailed, err);
    }
  }

  /** 计算所有卡片的真实距离 */
  private async calcDistances() {
    const userPos = await getUserPosition();
    if (!userPos) return;
    const cards = this.eventsData();
    for (const card of cards) {
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
  onTypeChange(type: 'request' | 'help' | null) {
    this.currentType = type;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type: type },
      queryParamsHandling: 'merge',
    });
    this.loadEvents();
  }
  /* 跳转到搜索页面 */
  navigateToSearch() {
    this.router.navigate(['/search'], {
      queryParams: { returnTo: 'tabs/tab2' },
    });
  }
}
