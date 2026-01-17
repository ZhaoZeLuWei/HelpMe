import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';

// 引入搜索组件 (不再依赖 UI)
import {
  UniversalSearchComponent,
  EventCardData,
} from '../../components/universal-search/universal-search.component';

// 引入展示组件 (在这里由 Tab2 接管)
import { ShowEventComponent } from '../../components/show-event/show-event.component';

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
export class Tab2Page implements OnInit {
  private readonly API_BASE = environment.apiBase;

  // 数据容器
  eventsData = signal<EventCardData[]>([]);

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    // 1. 定义两个请求地址（！！！！！！！！！！）
    const requestUrl = `${this.API_BASE}/api/cards?type=request`;
    const helpUrl = `${this.API_BASE}/api/cards?type=help`;

    // 2. 使用原生 fetch 同时发起请求
    Promise.all([fetch(requestUrl), fetch(helpUrl)])
      .then(async ([reqRes, helpRes]) => {
        // 检查两个请求是否成功
        if (!reqRes.ok || !helpRes.ok) {
          throw new Error('网络请求失败');
        }

        // 3. 解析 JSON
        const reqData = await reqRes.json();
        const helpData = await helpRes.json();

        // 4. 合并数据
        const allData = [...reqData, ...helpData];

        // 在 tab2.page.ts 的 loadEvents 方法里
        const transformedData = allData.map((item: any) => {
          // 【新增】把后端返回的每一项打印出来，看控制台
          console.log('正在处理的数据项：', item);

          const priceStr = item.price ? String(item.price) : '0.00';

          // 后端直接给 "/img/xxx.png"，不需要 JSON.parse
          const photoUrl = item.cardImage
            ? String(item.cardImage)
            : 'https://picsum.photos/seed/default/600/400';

          return {
            id: String(item.id),
            cardImage: photoUrl,
            icon: item.icon || 'navigate-outline',
            distance: item.distance || '未知距离',
            name: item.name,
            address: item.address,
            demand: item.demand,
            price: priceStr,
            avatar: item.avatar,
          } as EventCardData;
        });

        // 6. 更新 Signal
        console.log('从后端加载的数据（求助+帮助）：', transformedData);
        this.eventsData.set(transformedData);
      })
      .catch((err) => {
        console.error('请求后端失败，请确保后端已启动', err);
      });
  }
}
