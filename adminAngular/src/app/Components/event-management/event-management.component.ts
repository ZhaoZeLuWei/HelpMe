import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ServeAPIService } from '../../serve-api.service';

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-management.component.html',
  styleUrl: './event-management.component.css',
})
export class EventManagementComponent implements OnInit {
  private api = inject(ServeAPIService);
  events: any[] = [];

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents() {
    this.api.getAdminEventsList().subscribe({
      next: (res) => (this.events = res.events || []),
      error: () => alert('加载事件失败'),
    });
  }

  deleteEvent(eventId: number) {
    if (!confirm('确定删除该事件吗？')) return;
    this.api.deleteAdminEvent(eventId).subscribe({
      next: () => this.loadEvents(),
      error: () => alert('删除事件失败'),
    });
  }
}
