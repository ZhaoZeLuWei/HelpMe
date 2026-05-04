import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="dialog-overlay" *ngIf="visible" (click)="onCancel()">
      <div class="dialog-box" (click)="$event.stopPropagation()">
        <div class="dialog-icon" [class]="type">
          <mat-icon>{{ iconName }}</mat-icon>
        </div>
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <div class="dialog-actions">
          <button class="btn-cancel" (click)="onCancel()">取消</button>
          <button class="btn-confirm" [class]="type" (click)="onConfirm()">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dialog-overlay {
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

      .dialog-box {
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        animation: slideUp 0.3s ease;
      }

      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .dialog-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
      }

      .dialog-icon mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .dialog-icon.warning {
        background: #fef3c7;
        color: #f59e0b;
      }

      .dialog-icon.danger {
        background: #fee2e2;
        color: #ef4444;
      }

      .dialog-icon.info {
        background: #dbeafe;
        color: #3b82f6;
      }

      h3 {
        font-size: 18px;
        color: #1f2937;
        margin: 0 0 12px;
      }

      p {
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 24px;
        line-height: 1.6;
      }

      .dialog-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .btn-cancel,
      .btn-confirm {
        padding: 10px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }

      .btn-cancel {
        background: #f3f4f6;
        color: #374151;
      }

      .btn-cancel:hover {
        background: #e5e7eb;
      }

      .btn-confirm.warning {
        background: #f59e0b;
        color: white;
      }

      .btn-confirm.warning:hover {
        background: #d97706;
      }

      .btn-confirm.danger {
        background: #ef4444;
        color: white;
      }

      .btn-confirm.danger:hover {
        background: #dc2626;
      }

      .btn-confirm.info {
        background: #3b82f6;
        color: white;
      }

      .btn-confirm.info:hover {
        background: #2563eb;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = '确认操作';
  @Input() message = '确定要执行此操作吗？';
  @Input() confirmText = '确定';
  @Input() type: 'warning' | 'danger' | 'info' = 'warning';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  get iconName(): string {
    const map: Record<string, string> = {
      warning: 'warning',
      danger: 'error',
      info: 'info',
    };
    return map[this.type] || 'info';
  }

  onConfirm() {
    this.confirmed.emit();
  }

  onCancel() {
    this.cancelled.emit();
  }
}
