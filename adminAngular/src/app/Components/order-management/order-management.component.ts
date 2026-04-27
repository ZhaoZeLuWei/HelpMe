import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ServeAPIService } from '../../serve-api.service';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-management.component.html',
  styleUrl: './order-management.component.css',
})
export class OrderManagementComponent implements OnInit {
  private api = inject(ServeAPIService);
  orders: any[] = [];

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders() {
    this.api.getAdminOrdersList().subscribe({
      next: (res) => (this.orders = res.orders || []),
      error: () => alert('加载订单失败'),
    });
  }

  getStatusText(status: number): string {
    return status === 0 ? '待确认' : status === 1 ? '进行中' : status === 2 ? '待评价' : '已完成';
  }

  deleteOrder(orderId: number) {
    if (!confirm('确定删除该订单吗？')) return;
    this.api.deleteAdminOrder(orderId).subscribe({
      next: () => this.loadOrders(),
      error: () => alert('删除订单失败'),
    });
  }
}
