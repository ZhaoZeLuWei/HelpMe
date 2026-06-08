import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  errorMsg = '';
  loading = false;

  login() {
    if (!this.username || !this.password) {
      this.errorMsg = '请输入账号和密码';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.router.navigate(['/']);
        } else {
          this.errorMsg = '登录失败';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.error || '登录失败';
      },
    });
  }
}
