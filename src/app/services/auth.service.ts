import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // 登录状态流
  private _isLoggedIn$ = new BehaviorSubject<boolean>(!!localStorage.getItem('isLoggedIn'));
  public isLoggedIn$ = this._isLoggedIn$.asObservable();

  constructor() {}

  // 使用后端 API 登录
  async loginWithPhone(phone: string, code: string): Promise<boolean> {
    if (!phone || !code) return false;
    try {
      const resp = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
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
    this._isLoggedIn$.next(false);
  }
}
