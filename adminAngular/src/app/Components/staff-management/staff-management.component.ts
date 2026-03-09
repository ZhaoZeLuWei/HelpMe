import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServeAPIService } from '../../serve-api.service';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css',
})
export class StaffManagementComponent implements OnInit {
  // 用户列表
  users: any[] = [];

  // 当前查看的用户详情
  currentUser: any = null;

  // 是否显示详情弹窗
  showDetailModal: boolean = false;

  // 注入API服务
  private api = inject(ServeAPIService);

  public baseUrl: string = this.api.getBaseUrl();

  ngOnInit(): void {
    this.loadUsersList();
  }

  // 加载用户列表
  loadUsersList() {
    this.api.getAdminUsersList().subscribe({
      next: (res) => {
        if (res.success) {
          this.users = res.users;
          console.log('用户列表:', this.users);
        }
      },
      error: (err) => {
        console.error('加载用户列表失败', err);
        alert('加载用户列表失败');
      },
    });
  }

  // 查看用户详情
  viewUserDetail(userId: number) {
    this.api.getUserDetail(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.currentUser = res.user;
          this.showDetailModal = true;
          console.log('用户详情:', this.currentUser);
        }
      },
      error: (err) => {
        console.error('获取用户详情失败', err);
        alert('获取用户详情失败');
      },
    });
  }

  // 关闭详情弹窗
  closeDetail() {
    this.showDetailModal = false;
    this.currentUser = null;
  }

  // 删除用户
  deleteUser(userId: number) {
    if (confirm('确定要删除该用户吗？警告！此操作不可恢复！')) {
      this.api.deleteUser(userId).subscribe({
        next: (res) => {
          if (res.success) {
            alert('用户删除成功！');
            this.closeDetail();
            this.loadUsersList();
          }
        },
        error: (err) => {
          console.error('删除用户失败', err);
          alert('删除用户失败');
        },
      });
    }
  }

  // 与 list-verify-post 统一的映射方法
  getProviderRoleText(role: number | null | undefined): string {
    if (role === undefined || role === null) return '未知';
    switch (Number(role)) {
      case 1:
        return '热心群众';
      case 2:
        return '专业人士';
      default:
        return '未知';
    }
  }

  getServiceCategoryText(category: number | null | undefined): string {
    if (category === undefined || category === null) return '未知';
    switch (Number(category)) {
      case 1:
        return '全职';
      case 2:
        return '兼职';
      case 3:
        return '商家';
      default:
        return '未知';
    }
  }

  getVerifyClass(p: any): string {
    if (
      !p ||
      p.VerificationStatus === undefined ||
      p.VerificationStatus === null
    ) {
      return 'status-unverified';
    }
    switch (p.VerificationStatus) {
      case 0:
        return 'status-pending';
      case 1:
        return 'status-approved';
      case 2:
        return 'status-rejected';
      default:
        return 'status-unknown';
    }
  }

  getStatusText(status: number | null | undefined): string {
    if (status === undefined || status === null) return '未认证';
    switch (status) {
      case 0:
        return '待审核';
      case 1:
        return '已通过';
      case 2:
        return '已驳回';
      default:
        return '未认证';
    }
  }
}
