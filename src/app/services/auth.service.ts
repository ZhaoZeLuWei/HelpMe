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

  // 本地模拟登录。后续替换为API 调用。
  loginWithPhone(phone: string, code: string): boolean {
    const ok = phone === '15200000000' && code === '1234';
    if (ok) {
      localStorage.setItem('isLoggedIn', '1');
      this._isLoggedIn$.next(true);
    }
    return ok;
  }

  logout() {
    localStorage.removeItem('isLoggedIn');
    this._isLoggedIn$.next(false);
  }
}
