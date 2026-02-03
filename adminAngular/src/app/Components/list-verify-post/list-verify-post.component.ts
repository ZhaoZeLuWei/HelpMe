import {Component, inject, OnInit} from '@angular/core';
import { CommonModule} from '@angular/common';
import { ServeAPIService } from '../../serve-api.service';

@Component({
  selector: 'app-list-verify-post',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-verify-post.component.html',
  styleUrl: './list-verify-post.component.css'
})

export class ListVerifyPostComponent implements OnInit {
  //list of providers
  providers: any[] = [];

  //inject api service
  private api = inject(ServeAPIService);

  ngOnInit(): void {
    this.loadVerifyList();
  }

  loadVerifyList() {
    this.api.getAdminVerifyList().subscribe({
      next: (res) => {
        this.providers = res.data;
        console.log('Admin verify list:', this.providers);
      },
      error: (err) => {
        console.error('Failed to load verify list', err);
      }
    });
  }

  getVerifyText(p: any): string {
    return p.IsVerified === 1 ? '已认证' : '未认证';
  }
}
