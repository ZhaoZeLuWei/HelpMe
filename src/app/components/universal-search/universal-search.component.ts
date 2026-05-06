import { Component, OnInit, Output, EventEmitter, computed, inject, input, signal, ContentChild, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
// 修改后 (确保 IonList 和 IonItem 都在)
import {
  IonHeader, IonToolbar, IonContent, IonTitle,
  IonLabel, IonButton,
  IonRow, IonCol,
  IonIcon, IonModal, IonList, IonItem,
  IonSearchbar, IonRange, IonButtons,
  IonInput
} from '@ionic/angular/standalone';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormControl
} from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  startWith
} from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { pricetag, location, funnel, cash, navigate, chevronForward, fileTray, call, search } from 'ionicons/icons';

// 只保留这一个 import，删除了重复的引入
import { EventCardData } from '../show-event/show-event.component';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-universal-search',
  templateUrl: './universal-search.component.html',
  styleUrls: ['./universal-search.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonContent, IonTitle,
    IonLabel, IonButton,
    IonRow, IonCol,
    IonIcon, IonModal, IonList, IonItem, // <--- 添加 IonItem
    IonSearchbar, IonRange, IonButtons,
    IonInput,
  ]
})
export class UniversalSearchComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly langService = inject(LanguageService);

  // 翻译对象
  t = this.langService.getTranslations('zh').shared.search;

  // --- 数据输入 ---
  dataSource = input<EventCardData[]>([]);
  detailRoute = input<string>('/');
  @Output() searchEvent = new EventEmitter<string>();
  // 在类中添加
  currentType: 'request' | 'help' | null = null;

// 添加 Output 事件，通知父组件类型变化
  @Output() typeChange = new EventEmitter<'request' | 'help' | null>();
  // --- 状态管理 ---
  modals = signal({
    price: false,
    location: false
  });

  // 【优化】将确认搜索词的 Signal 移到这里，更清晰
  confirmedSearchText = signal('');

  // --- 价格档次 ---
  selectedPriceTier = signal(-1); // -1 = 未选（全部）
  readonly priceTiers = [
    { label: '全部价格', min: null as number | null, max: null as number | null },
    { label: '0-100元',   min: 0,   max: 100 },
    { label: '100-500元', min: 100, max: 500 },
    { label: '500-1000元', min: 500, max: 1000 },
    { label: '1000元以上', min: 1000, max: null },
  ];

  selectPriceTier(index: number) {
    this.selectedPriceTier.set(this.selectedPriceTier() === index ? -1 : index);
    this.setModal('price', false);
  }

  // --- 表单定义 ---
  filterForm: FormGroup = this.fb.group({
    searchText: [''],
    location: ['']
  });

  formValueSignal = toSignal(
    this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value),
      debounceTime(300),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    ),
    { initialValue: this.filterForm.value }
  );
  @ContentChild('cardTemplate', { static: true }) cardTemplate!: TemplateRef<any>;
  @ViewChild('searchBar') searchBar!: IonSearchbar;          // ← 拿到搜索框

  // --- 核心筛选逻辑 ---
  filteredEvents = computed(() => {
    const allEvents = this.dataSource();
    const form      = this.formValueSignal();          // 只用于地点
    const term      = this.confirmedSearchText();      // 只用于搜索词

    if (!Array.isArray(allEvents)) return [];

    return allEvents.filter(item => {
      // 1. 搜索词过滤
      if (term && !item.demand?.toLowerCase().includes(term.toLowerCase()) && !item.title?.toLowerCase().includes(term.toLowerCase())) {
        return false;
      }

      // 2. 价格档次筛选
      const tierIdx = this.selectedPriceTier();
      if (tierIdx >= 0) {
        const tier = this.priceTiers[tierIdx];
        const price = parseFloat(item.price ?? '0');
        if (!isNaN(price)) {
          if (tier.min !== null && price < tier.min) return false;
          if (tier.max !== null && price > tier.max) return false;
        }
      }

      // 3. 地点关键词
      const locKeyword = form.location ?? '';
      if (locKeyword && !item.address?.includes(locKeyword)) return false;

      return true;
    });
  });

  filterByType(type: 'request' | 'help') {
    if (this.currentType === type) {
      this.currentType = null;
    } else {
      this.currentType = type;
    }
    this.typeChange.emit(this.currentType);
  }

  // --- 构造函数 ---
  constructor() {
    addIcons({ pricetag, location, funnel, cash, navigate, chevronForward, fileTray, call, search });
  }
  // 新增方法：初始化时同步路由参数
  ngOnInit() {
    // 监听语言变化
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).shared.search;
    });

    // 订阅路由参数的变化
    this.route.queryParams.subscribe(params => {
      const keyword = params['search'];

      if (keyword) {
        // 1. 将关键词填入搜索框 (更新 FormControl)
        this.searchControl.setValue(keyword);

        // 2. 【关键】更新确认的搜索词 (更新 Signal)
        // 这会触发 filteredEvents 的重新计算，从而筛选数据
        this.confirmedSearchText.set(keyword);
      } else {
        // 如果 URL 没有关键词，确保清空状态
        this.searchControl.setValue('');
        this.confirmedSearchText.set('');
      }
    });
    // 添加 type 参数订阅
  this.route.queryParams.subscribe(params => {
    const type = params['type'];
    if (type === 'request' || type === 'help') {
      this.currentType = type;
    } else {
      this.currentType = null;
    }
  });
  }



  // --- 方法 ---

  setModal(key: string, isOpen: boolean) {
    this.modals.update(m => ({ ...m, [key]: isOpen }));
  }

  resetFilters() {
    this.filterForm.reset({
      searchText: '',
      location: ''
    });
    this.selectedPriceTier.set(-1);
    this.confirmedSearchText.set(''); // 清空确认的搜索词
    // 清除 URL 中的搜索参数
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: 'merge'
    });
  }

  onSearch() {
    const currentVal = this.searchControl.value || '';
    this.confirmedSearchText.set(currentVal);
    this.searchEvent.emit(currentVal);          // 父组件可监听
  }
  // 修改一下 goToDetail，让它接收完整的 event 对象，方便模板调用
  handleCardClick(event: EventCardData) {
    this.goToDetail(event);
  }

  goToDetail(event: EventCardData) {
    this.router.navigate(['/particular'], {
      queryParams: { eventId: event.id }
    });
  }

  get searchControl(): FormControl {
    return this.filterForm.get('searchText') as FormControl;
  }
}

export { EventCardData };
