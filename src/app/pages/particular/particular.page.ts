import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonContent, IonHeader, IonToolbar, IonIcon, IonButtons, IonFooter, IonRow,IonCol} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { EventCardData } from '../../components/show-event/show-event.component';
import { AuthService, ProviderProfile } from '../../services/auth.service';
import { environment } from 'src/environments/environment'

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
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class ParticularPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);// 新增
  readonly apiBase = environment.apiBase;   // ← 新增这一行
  profile: ProviderProfile | null = null; // 新增
  event: EventCardData | null = null;
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['event']) {
        try {
          this.event = JSON.parse(params['event']);

          /* === 新增：拿发布者信息 ===================== */
          if (this.event?.id) {   // id 就是 CreatorId
            this.auth.getProviderProfile(Number(this.event.creatorId)).then(p => this.profile = p);
          }
          /* =========================================== */
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
