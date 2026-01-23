import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProviderProfile {
  UserId: number;
  UserName: string;
  CreateTime: string;
  serviceScore: number;
  orderCount: number;   // 新增
}
@Injectable({
  providedIn: 'root',
})

export class AuthService {
  private readonly API_BASE = environment.apiBase;

  // 登录状态流
  private _isLoggedIn$ = new BehaviorSubject<boolean>(
    !!localStorage.getItem('isLoggedIn'),
  );
  public isLoggedIn$ = this._isLoggedIn$.asObservable();

  constructor() {}

  get currentUser(): any | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  get currentUserId(): number | null {
    const u = this.currentUser;
    const id = u?.UserId ?? u?.userId ?? u?.id ?? null;
    return typeof id === 'number' ? id : id ? Number(id) : null;
  }

  // 使用后端 API 登录
  async loginWithPhone(phone: string, code: string): Promise<boolean> {
    if (!phone || !code) return false;
    try {
      const resp = await fetch(`${this.API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      if (!resp.ok) return false;

      const data = await resp.json();
      if (data && data.success && data.user) {
        localStorage.setItem('isLoggedIn', '1');
        localStorage.setItem('user', JSON.stringify(data.user));
        this._isLoggedIn$.next(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  }

  logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    this._isLoggedIn$.next(false);
  }
  async getProviderProfile(userId: number): Promise<ProviderProfile | null> {
    try {
      const res = await fetch(`${this.API_BASE}/api/provider-profile?userId=${userId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data as ProviderProfile : null;
    } catch (e) {
      console.error('getProviderProfile error:', e);
      return null;
    }
  }
}
