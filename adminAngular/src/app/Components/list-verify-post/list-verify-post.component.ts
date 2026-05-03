import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServeAPIService } from '../../serve-api.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-list-verify-post',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent, MatIconModule],
  templateUrl: './list-verify-post.component.html',
  styleUrl: './list-verify-post.component.css',
})
export class ListVerifyPostComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('statusSelect') statusSelect!: ElementRef<HTMLSelectElement>;
  @ViewChild('reviewTextarea') reviewTextarea!: ElementRef<HTMLTextAreaElement>;

  providers: any[] = [];
  filteredProviders: any[] = [];
  currentDetail: any = null;
  showDetailModal = false;

  // 删除确认
  showDeleteDialog = false;
  deleteTarget: any = null;

  // 警告弹窗
  showWarningDialog = false;
  warningMessage = '';

  private api = inject(ServeAPIService);
  public baseUrl: string = this.api.getBaseUrl();

  ngOnInit(): void {
    this.loadVerifyList();
  }

  loadVerifyList() {
    this.api.getAdminVerifyList().subscribe({
      next: (res) => {
        this.providers = res.data;
        this.applyFilter();
      },
      error: () => alert('加载认证列表失败'),
    });
  }

  applyFilter() {
    const searchText = this.searchInput?.nativeElement.value || '';
    const statusFilter = this.statusSelect?.nativeElement.value || 'all';

    let result = [...this.providers];

    if (searchText) {
      const text = searchText.toLowerCase();
      result = result.filter(
        (p) =>
          p.UserName?.toLowerCase().includes(text) ||
          p.ProviderId?.toString().includes(text),
      );
    }

    if (statusFilter !== 'all') {
      const status = Number(statusFilter);
      result = result.filter((p) => {
        if (status === -1) return p.VerificationStatus === undefined || p.VerificationStatus === null;
        return p.VerificationStatus === status;
      });
    }

    this.filteredProviders = result;
  }

  onSearchChange() {
    this.applyFilter();
  }

  onFilterChange() {
    this.applyFilter();
  }

  getVerifyText(p: any): string {
    if (p.VerificationStatus === undefined || p.VerificationStatus === null) return '未认证';
    const map: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已驳回' };
    return map[p.VerificationStatus] || '未知';
  }

  getVerifyClass(p: any): string {
    if (p?.VerificationStatus === undefined || p?.VerificationStatus === null) return 'status-unverified';
    const map: Record<number, string> = { 0: 'status-pending', 1: 'status-approved', 2: 'status-rejected' };
    return map[p.VerificationStatus] || 'status-unknown';
  }

  getProviderRoleText(role: number | null | undefined): string {
    if (role === undefined || role === null) return '未知';
    const map: Record<number, string> = { 1: '热心群众', 2: '专业人士', 3: '商家' };
    return map[Number(role)] || '未知';
  }

  getServiceCategoryText(category: number | null | undefined): string {
    if (category === undefined || category === null) return '未设置';
    const map: Record<number, string> = { 1: '热心群众', 2: '专业人士', 3: '商家' };
    return map[Number(category)] || '未知';
  }

  getStatusText(status: number | null | undefined): string {
    return this.getVerifyText({ VerificationStatus: status });
  }

  viewDetail(providerId: number) {
    this.api.getVerifyDetail(providerId).subscribe({
      next: (res) => {
        if (res.success) {
          this.currentDetail = res.data;
          this.showDetailModal = true;
        }
      },
      error: () => alert('获取认证详情失败'),
    });
  }

  closeDetail() {
    this.showDetailModal = false;
    this.currentDetail = null;
  }

  approveVerification() {
    if (!this.currentDetail) return;
    const comment = this.reviewTextarea?.nativeElement.value?.trim() || '审核通过';
    this.showDeleteDialog = true;
    this.deleteTarget = { type: 'approve', id: this.currentDetail.UserId, comment };
  }

  rejectVerification() {
    if (!this.currentDetail) return;
    const comment = this.reviewTextarea?.nativeElement.value?.trim() || '';
    if (!comment) {
      this.warningMessage = '驳回申请必须填写原因！';
      this.showWarningDialog = true;
      return;
    }
    this.showDeleteDialog = true;
    this.deleteTarget = { type: 'reject', id: this.currentDetail.UserId, comment };
  }

  onConfirmAction() {
    if (!this.deleteTarget) return;

    if (this.deleteTarget.type === 'approve') {
      this.api.approveVerification(this.deleteTarget.id, this.deleteTarget.comment).subscribe({
        next: (res) => {
          if (res.success) {
            this.closeDetail();
            this.loadVerifyList();
          }
        },
        error: () => alert('审核通过失败'),
      });
    } else {
      this.api.rejectVerification(this.deleteTarget.id, this.deleteTarget.comment).subscribe({
        next: (res) => {
          if (res.success) {
            this.closeDetail();
            this.loadVerifyList();
          }
        },
        error: () => alert('审核驳回失败'),
      });
    }

    this.showDeleteDialog = false;
    this.deleteTarget = null;
  }

  onCancelAction() {
    this.showDeleteDialog = false;
    this.deleteTarget = null;
  }

  closeWarning() {
    this.showWarningDialog = false;
    this.warningMessage = '';
  }
}
