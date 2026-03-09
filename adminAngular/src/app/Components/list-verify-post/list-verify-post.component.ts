import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServeAPIService } from '../../serve-api.service';

@Component({
  selector: 'app-list-verify-post',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './list-verify-post.component.html',
  styleUrl: './list-verify-post.component.css',
})
export class ListVerifyPostComponent implements OnInit {
  // 认证列表
  providers: any[] = [];

  // 当前查看的详情
  currentDetail: any = null;

  // 是否显示详情弹窗
  showDetailModal: boolean = false;

  // 审核回复内容
  reviewComment: string = '';

  // 注入API服务
  private api = inject(ServeAPIService);

  public baseUrl: string = this.api.getBaseUrl();

  ngOnInit(): void {
    this.loadVerifyList();
  }

  // 加载认证列表
  loadVerifyList() {
    this.api.getAdminVerifyList().subscribe({
      next: (res) => {
        this.providers = res.data;
        console.log('认证列表:', this.providers);
      },
      error: (err) => {
        console.error('加载认证列表失败', err);
        alert('加载认证列表失败');
      },
    });
  }

  // 获取认证状态文本
  getVerifyText(p: any): string {
    // VerificationStatus: 0=待审核, 1=已通过, 2=已驳回
    // 如果没有VerificationStatus字段或为null，表示未认证
    if (p.VerificationStatus === undefined || p.VerificationStatus === null) {
      return '未认证';
    }
    switch (p.VerificationStatus) {
      case 0:
        return '待审核';
      case 1:
        return '已通过';
      case 2:
        return '已驳回';
      default:
        return '未知';
    }
  }

  // 获取认证状态CSS类
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

  // ProviderRole 映射：1 热心群众，2 专业人士
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

  // ServiceCategory 映射：1 全职，2 兼职，3 商家
  getServiceCategoryText(category: number | null | undefined): string {
    if (category === undefined || category === null) return '未设置';
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

  // 查看详情
  viewDetail(providerId: number) {
    this.api.getVerifyDetail(providerId).subscribe({
      next: (res) => {
        if (res.success) {
          this.currentDetail = res.data;
          this.showDetailModal = true;
          this.reviewComment = '';
          console.log('认证详情:', this.currentDetail);
        }
      },
      error: (err) => {
        console.error('获取详情失败', err);
        alert('获取认证详情失败');
      },
    });
  }

  // 关闭详情弹窗
  closeDetail() {
    this.showDetailModal = false;
    this.currentDetail = null;
    this.reviewComment = '';
  }

  // 审核通过
  approveVerification() {
    if (!this.currentDetail) return;

    const comment = this.reviewComment.trim() || '审核通过';

    if (confirm(`确定通过该认证申请吗？`)) {
      this.api
        .approveVerification(this.currentDetail.UserId, comment)
        .subscribe({
          next: (res) => {
            if (res.success) {
              alert('审核通过成功！');
              this.closeDetail();
              this.loadVerifyList();
            }
          },
          error: (err) => {
            console.error('审核通过失败', err);
            alert('审核通过失败');
          },
        });
    }
  }

  // 审核驳回
  rejectVerification() {
    if (!this.currentDetail) return;

    const comment = this.reviewComment.trim();

    if (!comment) {
      alert('驳回申请必须填写原因！');
      return;
    }

    if (confirm(`确定驳回该认证申请吗？`)) {
      this.api
        .rejectVerification(this.currentDetail.UserId, comment)
        .subscribe({
          next: (res) => {
            if (res.success) {
              alert('审核驳回成功！');
              this.closeDetail();
              this.loadVerifyList();
            }
          },
          error: (err) => {
            console.error('审核驳回失败', err);
            alert('审核驳回失败');
          },
        });
    }
  }

  // 获取认证状态文本
  getStatusText(status: number | null | undefined): string {
    if (status === undefined || status === null) {
      return '未认证';
    }
    switch (status) {
      case 0:
        return '待审核';
      case 1:
        return '已通过';
      case 2:
        return '已驳回';
      default:
        return '未知';
    }
  }
}
