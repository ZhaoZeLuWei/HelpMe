import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = environment.apiBase;
  private tokenKey = 'admin_token';

  private _isLoggedIn = signal(this.hasToken());
  isLoggedIn = computed(() => this._isLoggedIn());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  // 管理员登录
  login(username: string, password: string) {
    return this.http
      .post<{
        success: boolean;
        token: string;
      }>(`${this.baseUrl}/admin/login`, { username, password })
      .pipe(
        tap((res) => {
          if (res.success && res.token) {
            localStorage.setItem(this.tokenKey, res.token);
            this._isLoggedIn.set(true);
          }
        }),
      );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this._isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
}
