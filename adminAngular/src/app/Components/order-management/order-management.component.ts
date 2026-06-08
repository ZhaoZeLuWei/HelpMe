import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { ServeAPIService } from '../../serve-api.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { DetailModalComponent } from '../shared/detail-modal.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogComponent,
    DetailModalComponent,
    MatIconModule,
  ],
  templateUrl: './order-management.component.html',
  styleUrl: './order-management.component.css',
})
export class OrderManagementComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('statusSelect') statusSelect!: ElementRef<HTMLSelectElement>;

  private api = inject(ServeAPIService);
  orders: any[] = [];
  filteredOrders: any[] = [];

  // 弹窗状态
  showDeleteDialog = false;
  showDetailModal = false;
  selectedOrder: any = null;
  orderToDelete: any = null;

  // 订单详情数据
  orderReviews: any[] = [];
  loadingReviews = false;
  parsedLocation = { address: '', specific: '', additional: '' };
  eventSnapshot: any = null;

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders() {
    this.api.getAdminOrdersList().subscribe({
      next: (res) => {
        this.orders = res.orders || [];
        this.applyFilter();
      },
      error: () => alert('加载订单失败'),
    });
  }

  applyFilter() {
    const searchText = this.searchInput?.nativeElement.value || '';
    const statusFilter = this.statusSelect?.nativeElement.value || 'all';

    let result = [...this.orders];

    if (searchText) {
      const text = searchText.toLowerCase();
      result = result.filter(
        (o) =>
          o.EventTitle?.toLowerCase().includes(text) ||
          o.ConsumerName?.toLowerCase().includes(text) ||
          o.ProviderName?.toLowerCase().includes(text) ||
          o.OrderId?.toString().includes(text),
      );
    }

    if (statusFilter !== 'all') {
      const status = Number(statusFilter);
      result = result.filter((o) => o.OrderStatus === status);
    }

    this.filteredOrders = result;
  }

  onSearchChange() {
    this.applyFilter();
  }

  onFilterChange() {
    this.applyFilter();
  }

  getStatusText(status: number): string {
    const map: Record<number, string> = {
      0: '待确认',
      1: '进行中',
      2: '待评价',
      3: '已完成',
      4: '已取消',
    };
    return map[status] || '未知';
  }

  getStatusClass(status: number): string {
    const map: Record<number, string> = {
      0: 'status-pending',
      1: 'status-active',
      2: 'status-review',
      3: 'status-completed',
      4: 'status-cancelled',
    };
    return map[status] || '';
  }

  viewDetail(order: any) {
    this.selectedOrder = order;
    this.parsedLocation = this.parseDetailLocation(order.DetailLocation);
    this.eventSnapshot = this.parseEventSnapshot(order.EventSnapshot);
    this.showDetailModal = true;

    // 加载评价数据
    this.loadOrderReviews(order.OrderId);
  }

  closeDetail() {
    this.showDetailModal = false;
    this.selectedOrder = null;
    this.orderReviews = [];
    this.eventSnapshot = null;
    this.parsedLocation = { address: '', specific: '', additional: '' };
  }

  parseDetailLocation(loc: string): {
    address: string;
    specific: string;
    additional: string;
  } {
    if (!loc) return { address: '', specific: '', additional: '' };
    const parts = loc.split('｜').map((p) => p.trim());
    return {
      address: parts[0] || '',
      specific: parts[1] || '',
      additional: parts[2] || '',
    };
  }

  parseEventSnapshot(snapshot: any): any {
    if (!snapshot) return null;
    try {
      return typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
    } catch {
      return null;
    }
  }

  loadOrderReviews(orderId: number) {
    this.loadingReviews = true;
    this.orderReviews = [];
    this.api.getReviewsByOrderId(orderId).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.reviews)) {
          this.orderReviews = res.reviews;
        }
      },
      error: () => {
        console.error('加载评价失败');
      },
      complete: () => {
        this.loadingReviews = false;
      },
    });
  }

  getScoreArray(score: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  isStarFilled(star: number, score: number): boolean {
    return star <= Math.floor(score);
  }

  confirmDelete(order: any) {
    this.orderToDelete = order;
    this.showDeleteDialog = true;
  }

  onDeleteConfirmed() {
    if (!this.orderToDelete) return;
    this.api.deleteAdminOrder(this.orderToDelete.OrderId).subscribe({
      next: () => {
        this.loadOrders();
        this.showDeleteDialog = false;
        this.orderToDelete = null;
      },
      error: () => alert('删除订单失败'),
    });
  }

  onDeleteCancelled() {
    this.showDeleteDialog = false;
    this.orderToDelete = null;
  }
}
