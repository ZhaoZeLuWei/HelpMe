import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonContent, IonHeader, IonToolbar, IonIcon, IonButtons, IonFooter, IonRow, IonCol, IonTitle, IonBadge } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-user-particular',
  templateUrl: './user-particular.page.html',
  styleUrls: ['./user-particular.page.scss'],
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
    IonTitle,
    IonBadge,
  ],
})
export class UserParticularPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly apiBase = environment.apiBase;
  
  // 用户信息
  userInfo: any = {
    name: '',
    location: '',
    introduction: '',
    avatar: '',
    buyerRanking: 0,
    providerRole: 0,
    orderCount: 0,
    serviceRanking: 0,
    isVerified: '未认证',
    stats: { favorites: 0, views: 0, follows: 0 },
    CreateTime: ''
  };
  
  userId: number | null = null;
  
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.userInfo.name = params['name'] || '';
      this.userId = params['userId'] ? Number(params['userId']) : null;
      
      // 如果有 userId，加载用户详情
      if (this.userId) {
        this.loadUserFromStorage(this.userId);
      }
    });
  }
  
  // 加载用户信息
  async loadUserFromStorage(userId: number): Promise<void> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/profile`);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (data?.success && data.user) {
          this.userInfo.name = data.user.UserName || '';
          this.userInfo.location = data.user.Location || '';
          this.userInfo.introduction = data.user.Introduction || '';
          this.userInfo.avatar = data.user.UserAvatar || '';
          this.userInfo.buyerRanking = data.user.BuyerRanking ?? 0;
          this.userInfo.providerRole = data.user.ProviderRole ?? 0;
          this.userInfo.orderCount = data.user.OrderCount ?? 0;
          this.userInfo.serviceRanking = data.user.ServiceRanking ?? 0;
          this.userInfo.CreateTime = data.user.CreateTime || '';
        }
      }
    } catch (e) {
      console.error('loadUserFromStorage error', e);
    }
  }
  
  // 获取服务等级文本
  getServiceRoleText(providerRole: number): string {
    switch (providerRole) {
      case 1:
        return '热心用户';
      case 2:
        return '服务达人';
      default:
        return '普通用户';
    }
  }
  
  // 获取服务等级颜色
  getServiceRoleColor(providerRole: number): string {
    switch (providerRole) {
      case 1:
        return 'warning';
      case 2:
        return 'success';
      default:
        return 'medium';
    }
  }
  
  // 获取头像URL
  getAvatarUrl(avatarPath?: string): string {
    if (!avatarPath || avatarPath.trim() === '') {
      return '/assets/icon/user.svg';
    }
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return environment.apiBase + avatarPath;
  }
  
  // 返回上一页
  goBack() {
    this.router.navigate(['/tabs/tab1']);
  }
}
