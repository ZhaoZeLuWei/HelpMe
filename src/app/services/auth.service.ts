import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _isLoggedIn$ = new BehaviorSubject<boolean>(
    !!localStorage.getItem('isLoggedIn'),
  );
  public isLoggedIn$ = this._isLoggedIn$.asObservable();

  constructor() {}

  get isLoggedInValue(): boolean {
    return this._isLoggedIn$.value;
  }

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
    if (!u) return null;
    const id = Number(u.UserId ?? u.userId ?? u.id);
    return Number.isFinite(id) ? id : null;
  }

  async loginWithPhone(phone: string, code: string): Promise<boolean> {
    if (!phone || !code) return false;

    try {
      const resp = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      if (!resp.ok) return false;

      const data = await resp.json();

      if (data?.success && data.user) {
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
}
