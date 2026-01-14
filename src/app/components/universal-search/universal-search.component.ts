import { Component, computed, inject, input, signal, ContentChild, TemplateRef } from '@angular/core'; // <--- 引入 ContentChild 和 TemplateRef
import { CommonModule } from '@angular/common';
// 修改后 (确保 IonList 和 IonItem 都在)
import {
  IonHeader, IonToolbar, IonContent, IonTitle,
  IonLabel, IonButton,
  IonRow, IonCol,
  IonGrid,
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
import { addIcons } from 'ionicons';
import { pricetag, location, funnel, cash, navigate, chevronForward, fileTray, call, search } from 'ionicons/icons';

// 只保留这一个 import，删除了重复的引入
import { EventCardData } from '../show-event/show-event.component';

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
    IonGrid,
    IonIcon, IonModal, IonList, IonItem, // <--- 添加 IonItem
    IonSearchbar, IonRange, IonButtons,
    IonInput,
  ]
})
export class UniversalSearchComponent {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // --- 数据输入 ---
  dataSource = input<EventCardData[]>([]);
  detailRoute = input<string>('/');

  // --- 状态管理 ---
  modals = signal({
    price: false,
    location: false
  });

  // 【优化】将确认搜索词的 Signal 移到这里，更清晰
  confirmedSearchText = signal('');

  // --- 表单定义 ---
  filterForm: FormGroup = this.fb.group({
    searchText: [''],
    priceRange: this.fb.group({
      min: [0],
      max: [1000]
    }),
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

  // --- 核心筛选逻辑 ---
  filteredEvents = computed(() => {
    const allEvents = this.dataSource();
    const form        = this.formValueSignal();          // 只用于价格/地点
    const term        = this.confirmedSearchText();      // 只用于搜索词

    if (!Array.isArray(allEvents)) return [];

    return allEvents.filter(item => {
      // 1. 搜索词过滤（核心修复）
      if (term && !item.demand?.toLowerCase().includes(term.toLowerCase())) {
        return false;
      }

      // 2. 价格区间
      const min = form.priceRange?.min ?? 0;
      const max = form.priceRange?.max ?? 1000;
      const price = parseFloat(item.price ?? '0');
      if (!isNaN(price) && (price < min || price > max)) return false;

      // 3. 地点关键词
      const locKeyword = form.location ?? '';
      if (locKeyword && !item.address?.includes(locKeyword)) return false;

      return true;
    });
  });

  // --- 构造函数 ---
  constructor() {
    addIcons({ pricetag, location, funnel, cash, navigate, chevronForward, fileTray, call, search });
  }

  // --- 方法 ---

  setModal(key: string, isOpen: boolean) {
    this.modals.update(m => ({ ...m, [key]: isOpen }));
  }

  resetFilters() {
    this.filterForm.reset({
      searchText: '',
      priceRange: { min: 0, max: 1000 },
      location: ''
    });
    this.confirmedSearchText.set(''); // 清空确认的搜索词
  }

  onSearch() {
    const currentVal = this.searchControl.value || '';
    this.confirmedSearchText.set(currentVal);
  }
  // 修改一下 goToDetail，让它接收完整的 event 对象，方便模板调用
  handleCardClick(event: EventCardData) {
    this.goToDetail(event.id);
  }

  goToDetail(itemId: string) {
    const path = this.detailRoute();
    const formattedPath = path.endsWith('/') ? path : path + '/';
    this.router.navigate([formattedPath, itemId]);
  }

  get searchControl(): FormControl {
    return this.filterForm.get('searchText') as FormControl;
  }
}

export { EventCardData };
