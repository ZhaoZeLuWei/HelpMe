import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
// 1. 在这里添加 IonInput
import {
  IonHeader, IonToolbar, IonContent, IonTitle,
  IonLabel, IonButton,
  IonRow, IonCol, IonCard, IonCardContent, IonAvatar,
  IonItem,
  IonIcon, IonModal, IonList,
  IonSearchbar, IonRange,
  IonButtons,
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
import { pricetag, location, funnel, time, cash, navigate, chevronForward, fileTray, call, search } from 'ionicons/icons';

// 1. 使用队友定义的接口
export interface EventCardData {
  id: string;
  cardImage: string;
  icon: string;
  distance: string;
  name: string;
  address: string;
  demand: string; // <--- 重点：这里是我们需要搜索的内容
  price: string; // <--- 注意：这里是字符串，过滤时需转为数字
  avatar: string;
}

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
    IonRow, IonCol, IonCard, IonCardContent, IonAvatar,
    IonItem, IonIcon, IonModal, IonList,
    IonSearchbar, IonRange, IonButtons,
    IonInput
  ]
})
export class UniversalSearchComponent {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // 2. Input 接收新接口的数据
  dataSource = input<EventCardData[]>([]);
  detailRoute = input<string>('/');

  modals = signal({
    price: false,
    location: false
    // 注意：由于新接口没有明确的 'category' (分类) 和 'demandType' (需求类型) 字段，
    // 我移除了这两个模态框的开关，只保留 价格 和 地点(地址) 筛选。
  });

  // 3. 表单定义简化，只保留需要的
  filterForm: FormGroup = this.fb.group({
    searchText: [''], // 搜索 demand 的内容
    priceRange: this.fb.group({
      min: [0],
      max: [1000]
    }),
    location: [''] // 筛选 address
  });

  formValueSignal = toSignal(
    this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value),
      debounceTime(300),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    ),
    { initialValue: this.filterForm.value }
  );

  // 4. 核心筛选逻辑更新
  filteredEvents = computed(() => {
    const allEvents = this.dataSource();
    // 这里我们直接读取 form 的值来获取价格和地点筛选
    const formValues = this.filterForm.value;
    // 获取用户确认后的搜索词 (而不是直接用输入框的值)
    const term = this.confirmedSearchText();

    if (!allEvents || allEvents.length === 0) return [];

    return allEvents.filter(item => {
      // A. 【关键修改】使用 confirmedSearchText 进行搜索
      if (term && !item.demand.toLowerCase().includes(term.toLowerCase())) {
        return false;
      }

      // B. 价格筛选 (保持不变)
      const itemPrice = parseFloat(item.price);
      if (!isNaN(itemPrice)) {
        if (itemPrice < formValues.priceRange.min || itemPrice > formValues.priceRange.max) {
          return false;
        }
      }

      // C. 地点筛选 (保持不变)
      if (formValues.location && !item.address.includes(formValues.location)) {
        return false;
      }

      return true;
    });
  });

  constructor() {
    addIcons({ pricetag, location, funnel, cash, navigate, chevronForward, fileTray, call, search });
  }

  setModal(key: string, isOpen: boolean) {
    this.modals.update(m => ({ ...m, [key]: isOpen }));
  }

  resetFilters() {
    this.filterForm.reset({
      searchText: '',
      priceRange: { min: 0, max: 1000 },
      location: ''
    });
    // 2. 【关键点】必须清空确认的搜索词，列表才会恢复显示所有数据
    this.confirmedSearchText.set('');
  }

  goToDetail(itemId: string) { // ID现在是string类型
    const path = this.detailRoute();
    const formattedPath = path.endsWith('/') ? path : path + '/';
    this.router.navigate([formattedPath, itemId]);
  }

  get searchControl(): FormControl {
    return this.filterForm.get('searchText') as FormControl;
  }

  // 1. 【新增】创建一个 Signal 专门存储用户确认后的搜索词
  confirmedSearchText = signal('');

  // 2. 【新增】点击搜索按钮时触发的函数
  onSearch() {
    // 将输入框当前的值赋给确认搜索词，从而触发 computed 重新计算列表
    const currentVal = this.searchControl.value || '';
    this.confirmedSearchText.set(currentVal);}
}
