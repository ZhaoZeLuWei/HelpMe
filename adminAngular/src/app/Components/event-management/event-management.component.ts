import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { ServeAPIService } from '../../serve-api.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { DetailModalComponent } from '../shared/detail-modal.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogComponent,
    DetailModalComponent,
    MatIconModule,
  ],
  templateUrl: './event-management.component.html',
  styleUrl: './event-management.component.css',
})
export class EventManagementComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('typeSelect') typeSelect!: ElementRef<HTMLSelectElement>;

  private api = inject(ServeAPIService);
  events: any[] = [];
  filteredEvents: any[] = [];

  // 弹窗状态
  showDeleteDialog = false;
  showDetailModal = false;
  selectedEvent: any = null;
  eventToDelete: any = null;

  // 删除确认弹窗配置
  deleteDialogTitle = '';
  deleteDialogMessage = '';
  deleteDialogType: 'warning' | 'danger' = 'danger';

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents() {
    this.api.getAdminEventsList().subscribe({
      next: (res) => {
        this.events = res.events || [];
        this.applyFilter();
      },
      error: () => alert('加载事件失败'),
    });
  }

  applyFilter() {
    const searchText = this.searchInput?.nativeElement.value || '';
    const typeFilter = this.typeSelect?.nativeElement.value || 'all';

    let result = [...this.events];

    if (searchText) {
      const text = searchText.toLowerCase();
      result = result.filter(
        (e) =>
          e.EventTitle?.toLowerCase().includes(text) ||
          e.CreatorName?.toLowerCase().includes(text) ||
          e.EventId?.toString().includes(text) ||
          e.Location?.toLowerCase().includes(text),
      );
    }

    if (typeFilter !== 'all') {
      const type = Number(typeFilter);
      result = result.filter((e) => e.EventType === type);
    }

    this.filteredEvents = result;
  }

  onSearchChange() {
    this.applyFilter();
  }

  onFilterChange() {
    this.applyFilter();
  }

  getTypeText(type: number): string {
    return type === 1 ? '帮助' : '求助';
  }

  getTypeClass(type: number): string {
    return type === 1 ? 'type-help' : 'type-request';
  }

  viewDetail(event: any) {
    this.selectedEvent = event;
    this.showDetailModal = true;
  }

  closeDetail() {
    this.showDetailModal = false;
    this.selectedEvent = null;
  }

  confirmDelete(event: any) {
    this.eventToDelete = event;
    const orderCount = event.OrderCount || 0;

    if (orderCount > 0) {
      this.deleteDialogTitle = '存在关联订单';
      this.deleteDialogMessage = `该事件存在 ${orderCount} 个关联订单，删除事件将同时删除这些订单。是否确认删除？`;
      this.deleteDialogType = 'warning';
    } else {
      this.deleteDialogTitle = '删除事件';
      this.deleteDialogMessage = `确定要删除事件 #${event.EventId} 吗？此操作不可撤销。`;
      this.deleteDialogType = 'danger';
    }

    this.showDeleteDialog = true;
  }

  onDeleteConfirmed() {
    if (!this.eventToDelete) return;
    this.api.deleteAdminEvent(this.eventToDelete.EventId).subscribe({
      next: () => {
        this.loadEvents();
        this.showDeleteDialog = false;
        this.eventToDelete = null;
      },
      error: (err) => {
        alert(err.error?.error || '删除事件失败');
      },
    });
  }

  onDeleteCancelled() {
    this.showDeleteDialog = false;
    this.eventToDelete = null;
  }
}
