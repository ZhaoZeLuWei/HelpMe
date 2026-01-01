import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonTitle,
  IonSegment, IonSegmentButton, IonLabel, IonButton,
  IonRow, IonCol, IonCard, IonCardContent, IonAvatar,
  IonItem, IonBadge, IonIcon, IonModal, IonList,
  IonSearchbar, IonRange, IonGrid, IonButtons, IonListHeader
} from '@ionic/angular/standalone';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormControl,
  Validators
} from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  startWith
} from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { pricetag, location, funnel, time, cash, navigate, chevronForward } from 'ionicons/icons';
// 1. 定义数据接口
interface EventItem {
  id: number;
  type: string;
  Introduction: string;
  price: number;
  userName: string;
  gender: string;
  locationName: string;
  time: string;
  demandType: string;
  avatar: string;
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonContent, IonTitle,
    IonSegment, IonSegmentButton, IonLabel, IonButton,
    IonRow, IonCol, IonCard, IonCardContent, IonAvatar,
    IonItem, IonBadge, IonIcon, IonModal, IonList,
    IonSearchbar, IonRange, IonGrid, IonButtons, IonListHeader
  ]
})
export class Tab2Page {


  // --- 依赖注入 ---
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router); // 4. 注入 Router 用于页面跳转

  // --- Signal 状态管理 ---
  // 模拟从 Service 获取的源数据 (使用 Signal 包装)
  eventsData = signal<EventItem[]>([
    { id: 101, type: '修理', Introduction: '修理水龙头', price: 50, userName: '封金', gender: '男', locationName: '广科社区', time: '11:00', demandType: '求助', avatar: 'https://picsum.photos/seed/fj/100/100' },
    { id: 102, type: '打扫', Introduction: '深度清洁', price: 120, userName: '张阿姨', gender: '女', locationName: '001社区', time: '14:00', demandType: '帮助', avatar: 'https://picsum.photos/seed/zhang/100/100' },
    { id: 103, type: '跑腿', Introduction: '买药', price: 20, userName: '李四', gender: '男', locationName: '002社区', time: '09:30', demandType: '求助', avatar: 'https://picsum.photos/seed/lisi/100/100' },
    { id: 104, type: '修理', Introduction: '修自行车', price: 15, userName: '王五', gender: '男', locationName: '广科社区', time: '16:00', demandType: '求助', avatar: 'https://picsum.photos/seed/wang/100/100' },
    { id: 105, type: '跑腿', Introduction: '取快递', price: 10, userName: '小明', gender: '男', locationName: '学校', time: '12:00', demandType: '求助', avatar: 'https://picsum.photos/seed/ming/100/100' }
  ]);

  // --- Reactive Forms 表单定义 ---
  // 管理所有筛选条件：分类、价格范围、地点、需求、高级搜索
  filterForm: FormGroup = this.fb.group({
    searchText: [''], // <--- 新增：顶部搜索框绑定
    category: ['全部'],
    priceRange: this.fb.group({
      min: [0],
      max: [1000]
    }),
    location: this.fb.group({
      type: [''],
      name: ['']
    }),
    demand: [''],
    advanced: this.fb.group({
      time: [''],
      keyword: ['']
    })
  });

  // --- RxJS + Signal 混合使用 ---
  // 将表单的 valueChanges (Observable) 转换为 Signal
  // 在转换过程中使用 RxJS 操作符进行优化：
  // 1. startWith: 初始化时立即触发一次
  // 2. debounceTime(300): 防抖，避免搜索输入时频繁触发计算 (性能优化)
  // 3. distinctUntilChanged: 只有值真正变化时才触发
  formValueSignal = toSignal(
    this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value),
      debounceTime(300),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    ),
    { initialValue: this.filterForm.value }
  );

  // --- 计算属性 ---
  // 基于源数据 Signal 和 表单值 Signal 自动计算最终显示的列表
  filteredEvents = computed(() => {
    const allEvents = this.eventsData();
    const filters = this.formValueSignal();

    return allEvents.filter(item => {
      // 1. 【新增】顶部搜索框：只搜 Introduction
      // 只有当 searchText 有值且不包含在 Introduction 中时才返回 false
      if (filters.searchText && !item.Introduction.includes(filters.searchText)) return false;

      // 2. 分类筛选
      if (filters.category !== '全部' && item.type !== filters.category) return false;

      // 3. 价格筛选
      if (item.price < filters.priceRange.min || item.price > filters.priceRange.max) return false;

      // 4. 地点筛选
      if (filters.location.name && item.locationName !== filters.location.name) return false;

      // 5. 需求筛选
      if (filters.demand && item.demandType !== filters.demand) return false;

      // 6. 高级筛选里的关键词 (如果也想支持高级搜索，可以保留这一行)
      if (filters.advanced.keyword && !item.Introduction.includes(filters.advanced.keyword)) return false;

      // 7. 高级筛选里的时间
      if (filters.advanced.time && item.time !== filters.advanced.time) return false;

      return true;
    });
  });

  // 模态框状态 (使用 Signal 管理简单的 UI 开关状态)
  modals = signal({
    price: false,
    location: false,
    demand: false,
    advanced: false
  });

  readonly categories = ['打扫', '修理', '跑腿', '更多'];
  constructor() {
    addIcons({ pricetag, location, funnel, time, cash, navigate, chevronForward });
  }



  // --- 交互与 Router ---

  // 打开/关闭模态框
  setModal(key: string, isOpen: boolean) {
    this.modals.update(m => ({ ...m, [key]: isOpen }));
  }

  // 重置表单
  resetFilters() {
    this.filterForm.reset({
      searchText: '', // <--- 新增：重置搜索框
      category: '全部',
      priceRange: { min: 0, max: 1000 },
      location: { type: '', name: '' },
      demand: '',
      advanced: { time: '', keyword: '' }
    });
    this.setModal('advanced', false);
  }

  // 4. Router 跳转逻辑
  // 点击卡片跳转到详情页 (假设路由配置为 /tabs/tab2/:id)
  goToDetail(eventId: number) {
    this.router.navigate(['/tabs/tab2/detail', eventId]);
  }
  // 2. 添加这个 getter 方法
  // 它告诉 TypeScript：这个控件一定存在，并且它是 FormControl 类型
  get searchControl(): FormControl {
    return this.filterForm.get('searchText') as FormControl;
  }
}
