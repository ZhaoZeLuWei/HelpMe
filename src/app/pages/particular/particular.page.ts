import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonContent, IonHeader, IonToolbar, IonIcon, IonButtons } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { EventCardData } from '../../components/show-event/show-event.component';

@Component({
  selector: 'app-particular',
  templateUrl: './particular.page.html',
  styleUrls: ['./particular.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonIcon,
    IonButtons,
  ],
})
export class ParticularPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  event: EventCardData | null = null;

  ngOnInit() {
    // 接收路由参数
    this.route.queryParams.subscribe(params => {
      if (params['event']) {
        try {
          this.event = JSON.parse(params['event']);
        } catch (error) {
          console.error('解析事件数据失败:', error);
        }
      }
    });
  }

  // 返回上一页
  goBack() {
    this.router.navigate(['/tabs/tab1']);
  }

  // 关注按钮点击事件
  onFollow() {
    console.log('关注按钮点击');
    // 暂时没有功能
  }

  // 收藏按钮点击事件
  onCollect() {
    console.log('收藏按钮点击');
    // 暂时没有功能
  }

  // 聊一聊按钮点击事件
  onChat() {
    console.log('聊一聊按钮点击');
    // 暂时没有功能
  }
}
