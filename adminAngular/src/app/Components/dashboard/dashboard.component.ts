import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServeAPIService } from '../../serve-api.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private api = inject(ServeAPIService);

  stats: any = {
    userCount: 0,
    orderCount: 0,
    eventCount: 0,
    pendingVerify: 0,
    orderStatus: {},
    eventType: {},
  };

  loading = true;

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats() {
    this.api.getAdminStats().subscribe({
      next: (res) => {
        if (res.success) {
          this.stats = res.stats;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  getOrderStatusCount(status: number): number {
    return this.stats.orderStatus?.[status] || 0;
  }

  getEventTypeCount(type: number): number {
    return this.stats.eventType?.[type] || 0;
  }

  getPieBackground(): string {
    const request = this.getEventTypeCount(0);
    const help = this.getEventTypeCount(1);
    const total = request + help;

    if (total === 0) {
      return 'conic-gradient(#e5e7eb 0deg, #e5e7eb 360deg)';
    }

    const requestDeg = (request / total) * 360;
    return `conic-gradient(#f59e0b 0deg, #f59e0b ${requestDeg}deg, #10b981 ${requestDeg}deg, #10b981 360deg)`;
  }
}
