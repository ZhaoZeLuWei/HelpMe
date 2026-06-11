import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServeAPIService } from '../../serve-api.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { DetailModalComponent } from '../shared/detail-modal.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogComponent,
    DetailModalComponent,
    MatIconModule,
  ],
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css',
})
export class StaffManagementComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('roleSelect') roleSelect!: ElementRef<HTMLSelectElement>;

  users: any[] = [];
  filteredUsers: any[] = [];
  currentUser: any = null;
  showDetailModal = false;

  // 封禁确认
  showBanDialog = false;
  banAction: 'ban' | 'unban' = 'ban';

  private api = inject(ServeAPIService);
  public baseUrl: string = this.api.getBaseUrl();

  ngOnInit(): void {
    this.loadUsersList();
  }

  loadUsersList() {
    this.api.getAdminUsersList().subscribe({
      next: (res) => {
        if (res.success) {
          this.users = res.users;
          this.applyFilter();
        }
      },
      error: () => alert('加载用户列表失败'),
    });
  }

  applyFilter() {
    const searchText = this.searchInput?.nativeElement.value || '';
    const roleFilter = this.roleSelect?.nativeElement.value || 'all';

    let result = [...this.users];

    if (searchText) {
      const text = searchText.toLowerCase();
      result = result.filter(
        (u) =>
          u.UserName?.toLowerCase().includes(text) ||
          u.RealName?.toLowerCase().includes(text) ||
          u.UserId?.toString().includes(text) ||
          u.PhoneNumber?.includes(text),
      );
    }

    if (roleFilter !== 'all') {
      const role = Number(roleFilter);
      if (role === -1) {
        result = result.filter((u) => u.ProviderRole === null);
      } else {
        result = result.filter((u) => u.ProviderRole === role);
      }
    }

    this.filteredUsers = result;
  }

  onSearchChange() {
    this.applyFilter();
  }

  onFilterChange() {
    this.applyFilter();
  }

  getProviderRoleText(role: number | null | undefined): string {
    if (role === undefined || role === null) return '普通用户';
    const map: Record<number, string> = {
      1: '热心群众',
      2: '专业人士',
      3: '商家',
    };
    return map[Number(role)] || '普通用户';
  }

  getProviderRoleClass(role: number | null | undefined): string {
    if (role === undefined || role === null) return 'role-none';
    return role === 2 ? 'role-pro' : 'role-normal';
  }

  getStatusText(status: number | null | undefined): string {
    if (status === undefined || status === null) return '未认证';
    const map: Record<number, string> = {
      0: '待审核',
      1: '已通过',
      2: '已驳回',
    };
    return map[status] || '未认证';
  }

  getStatusClass(status: number | null | undefined): string {
    if (status === undefined || status === null) return 'status-unverified';
    const map: Record<number, string> = {
      0: 'status-pending',
      1: 'status-approved',
      2: 'status-rejected',
    };
    return map[status] || 'status-unknown';
  }

  viewUserDetail(userId: number) {
    this.api.getUserDetail(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.currentUser = res.user;
          this.showDetailModal = true;
        }
      },
      error: () => alert('获取用户详情失败'),
    });
  }

  closeDetail() {
    this.showDetailModal = false;
    this.currentUser = null;
  }

  getAvatarUrl(avatar: string | null | undefined): string {
    if (!avatar) return 'assets/default-avatar.png';
    if (avatar.startsWith('http://') || avatar.startsWith('https://'))
      return avatar;
    return this.baseUrl + avatar;
  }

  confirmBan(action: 'ban' | 'unban') {
    this.banAction = action;
    this.showBanDialog = true;
  }

  onBanConfirmed() {
    if (!this.currentUser) return;
    const isBan = this.banAction === 'ban';
    this.api.banUser(this.currentUser.UserId, isBan).subscribe({
      next: (res) => {
        if (res.success) {
          this.currentUser.IsBanned = isBan ? 1 : 0;
          this.currentUser.BannedAt = isBan ? new Date().toISOString() : null;
          this.loadUsersList();
          this.showBanDialog = false;
        }
      },
      error: () => alert(isBan ? '封禁用户失败' : '解封用户失败'),
    });
  }

  onBanCancelled() {
    this.showBanDialog = false;
  }
}
