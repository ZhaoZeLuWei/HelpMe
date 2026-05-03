import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-detail-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="modal-overlay" *ngIf="visible" (click)="onClose()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" (click)="onClose()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="modal-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .modal-box {
        background: white;
        border-radius: 16px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        animation: slideUp 0.3s ease;
      }

      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
      }

      .modal-header h3 {
        font-size: 18px;
        color: #1f2937;
        margin: 0;
      }

      .close-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: #f3f4f6;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .close-btn:hover {
        background: #e5e7eb;
      }

      .close-btn mat-icon {
        color: #6b7280;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .modal-body {
        padding: 24px;
        overflow-y: auto;
        max-height: calc(80vh - 80px);
      }
    `,
  ],
})
export class DetailModalComponent {
  @Input() visible = false;
  @Input() title = '详情';

  @Output() closed = new EventEmitter<void>();

  onClose() {
    this.closed.emit();
  }
}
