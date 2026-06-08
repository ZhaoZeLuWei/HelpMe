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
  selector: 'app-review-management',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogComponent,
    DetailModalComponent,
    MatIconModule,
  ],
  templateUrl: './review-management.component.html',
  styleUrl: './review-management.component.css',
})
export class ReviewManagementComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('scoreSelect') scoreSelect!: ElementRef<HTMLSelectElement>;

  private api = inject(ServeAPIService);
  reviews: any[] = [];
  filteredReviews: any[] = [];

  // 弹窗状态
  showDeleteDialog = false;
  showDetailModal = false;
  selectedReview: any = null;
  reviewToDelete: any = null;

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews() {
    this.api.getAdminReviewsList().subscribe({
      next: (res) => {
        this.reviews = res.reviews || [];
        this.applyFilter();
      },
      error: () => alert('加载评价失败'),
    });
  }

  applyFilter() {
    const searchText = this.searchInput?.nativeElement.value || '';
    const scoreFilter = this.scoreSelect?.nativeElement.value || 'all';

    let result = [...this.reviews];

    if (searchText) {
      const text = searchText.toLowerCase();
      result = result.filter(
        (r) =>
          r.AuthorName?.toLowerCase().includes(text) ||
          r.TargetName?.toLowerCase().includes(text) ||
          r.EventTitle?.toLowerCase().includes(text) ||
          r.ReviewId?.toString().includes(text) ||
          r.Text?.toLowerCase().includes(text),
      );
    }

    if (scoreFilter !== 'all') {
      const score = Number(scoreFilter);
      result = result.filter((r) => Math.floor(Number(r.Score)) === score);
    }

    this.filteredReviews = result;
  }

  onSearchChange() {
    this.applyFilter();
  }

  onFilterChange() {
    this.applyFilter();
  }

  getScoreArray(score: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  isStarFilled(star: number, score: number): boolean {
    return star <= Math.floor(score);
  }

  isStarHalf(star: number, score: number): boolean {
    return star === Math.ceil(score) && score % 1 !== 0;
  }

  viewDetail(review: any) {
    this.selectedReview = review;
    this.showDetailModal = true;
  }

  closeDetail() {
    this.showDetailModal = false;
    this.selectedReview = null;
  }

  confirmDelete(review: any) {
    this.reviewToDelete = review;
    this.showDeleteDialog = true;
  }

  onDeleteConfirmed() {
    if (!this.reviewToDelete) return;
    this.api.deleteAdminReview(this.reviewToDelete.ReviewId).subscribe({
      next: () => {
        this.loadReviews();
        this.showDeleteDialog = false;
        this.reviewToDelete = null;
      },
      error: () => alert('删除评价失败'),
    });
  }

  onDeleteCancelled() {
    this.showDeleteDialog = false;
    this.reviewToDelete = null;
  }

  truncateText(text: string, maxLength: number = 30): string {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
