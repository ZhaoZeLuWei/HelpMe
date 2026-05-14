import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, map, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { LanguageService } from './language.service';

// 认证相关类型
type LoginOk = { ok: true };
type LoginFail = { ok: false; message: string; status?: number };

type Session = {
  token: string;
  user: any; // 项目里 user 字段结构不稳定（UserId/userId/id），先用 any 更稳
};

// 服务提供者资料接口
export interface ProviderProfile {
  UserId: number;
  UserName: string;
  CreateTime: string;
  serviceScore: number;
  orderCount: number;
  avatar: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_BASE = environment.apiBase;
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly langService = inject(LanguageService);

  /** 获取当前语言的登录相关翻译 */
  private get loginT() {
    return this.langService.getTranslations(this.langService.getCurrentLang())
      .login;
  }
  private get registerT() {
    return this.langService.getTranslations(this.langService.getCurrentLang())
      .register;
  }

  // 唯一真相：session（token + user）
  private readonly _session$ = new BehaviorSubject<Session | null>(
    this.readSessionFromStorage(),
  );
  private sessionExpiryTimer: ReturnType<typeof setTimeout> | null = null;
  private handlingAuthExpired = false;

  /** 给页面订阅：获取完整 session（token+user） */
  public readonly session$ = this._session$.asObservable();

  /** 给页面订阅：是否已登录（由 token 推导） */
  public readonly isLoggedIn$ = this.session$.pipe(
    map((s) => !!s?.token),
    distinctUntilChanged(),
  );

  constructor() {
    this.scheduleSessionExpiryCheck();
  }

  // ----------------- getters（同步读取，方便页面直接用） -----------------
  get token(): string | null {
    return this._session$.value?.token ?? null;
  }

  get currentUser(): any | null {
    return this._session$.value?.user ?? null;
  }

  get currentUserId(): number | null {
    const u = this.currentUser;
    const id = u?.UserId ?? u?.userId ?? u?.id ?? null;
    if (typeof id === 'number') return id;
    if (id == null) return null;
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }

  // ----------------- storage -----------------
  private readSessionFromStorage(): Session | null {
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');

    if (!token) return null;

    const expMs = this.decodeTokenExpMs(token);
    if (expMs != null && expMs <= Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }

    let user: any = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser);
      } catch {
        user = null;
      }
    }

    return { token, user };
  }

  private persistSession(session: Session | null) {
    if (!session) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return;
    }
    localStorage.setItem('token', session.token);
    localStorage.setItem('user', JSON.stringify(session.user ?? {}));
  }

  private setSession(session: Session | null) {
    this.persistSession(session);
    this._session$.next(session);
    this.scheduleSessionExpiryCheck();
  }

  private decodeTokenExpMs(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const normalized =
        base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4);

      const payload = JSON.parse(atob(normalized));
      if (typeof payload?.exp !== 'number') return null;
      return payload.exp * 1000;
    } catch {
      return null;
    }
  }

  private scheduleSessionExpiryCheck() {
    if (this.sessionExpiryTimer) {
      clearTimeout(this.sessionExpiryTimer);
      this.sessionExpiryTimer = null;
    }

    const token = this.token;
    if (!token) return;

    const expMs = this.decodeTokenExpMs(token);
    if (expMs == null) return;

    const delay = expMs - Date.now();
    if (delay <= 0) {
      void this.handleAuthExpired();
      return;
    }

    this.sessionExpiryTimer = setTimeout(() => {
      void this.handleAuthExpired();
    }, delay);
  }

  async handleAuthExpired(message?: string): Promise<void> {
    const msg = message || this.loginT.loginExpired;
    if (this.handlingAuthExpired) return;

    this.handlingAuthExpired = true;
    try {
      const hadToken = !!this.token;
      this.logout();

      if (hadToken) {
        const toast = await this.toastController.create({
          message: msg,
          duration: 1400,
          position: 'bottom',
          positionAnchor: 'main-tab-bar',
        });
        await toast.present();
      }

      if (!this.router.url.startsWith('/tabs/tab4')) {
        await this.router.navigate(['/tabs/tab4'], { replaceUrl: true });
      }
    } finally {
      this.handlingAuthExpired = false;
    }
  }

  // ----------------- auth header / fetch -----------------
  getAuthHeader(): Record<string, string> {
    const t = this.token;
    return t ? { Authorization: `Bearer ${t}` } : {};
  }
  // ----------------- login / logout -----------------
  async loginWithPhone(
    phone: string,
    code: string,
  ): Promise<LoginOk | LoginFail> {
    if (!phone || !code)
      return { ok: false, message: this.loginT.formIncomplete };

    const url = `${this.API_BASE}/login`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        const err =
          data?.error ||
          data?.msg ||
          resp.statusText ||
          this.loginT.formIncomplete;

        const mapErr: Record<string, string> = {
          'phone and code required': this.loginT.formIncomplete,
          'Invalid verification code': this.loginT.formIncomplete,
          'User not found': this.loginT.phoneNotRegistered,
        };

        return {
          ok: false,
          status: resp.status,
          message: mapErr[err] || String(err),
        };
      }

      // 期望后端返回：{ success: true, user, token }
      if (data?.success && data?.user && data?.token) {
        this.setSession({ token: String(data.token), user: data.user });
        return { ok: true };
      }

      // 如果后端暂时还没返回 token：这里明确告诉原因（否则 UI 会以为登录成功但鉴权接口全 401）
      if (data?.success && data?.user && !data?.token) {
        return {
          ok: false,
          message: this.loginT.loginSuccess,
        };
      }

      return { ok: false, message: this.loginT.formIncomplete };
    } catch (err) {
      console.error('Login error:', err);
      return { ok: false, message: this.registerT.networkError };
    }
  }

  async register(
    data: {
      phone: string;
      code: string;
      userName: string;
      realName: string;
      idCardNumber: string;
      location: string;
      locationPlaceId?: string;

      birthDate: string;
      introduction?: string;
    },
    avatarFile?: File | null,
  ): Promise<LoginOk | LoginFail> {
    if (
      !data.phone ||
      !data.code ||
      !data.userName ||
      !data.realName ||
      !data.idCardNumber ||
      !data.location ||
      !data.birthDate
    ) {
      return {
        ok: false,
        message: this.registerT.formRequired,
      };
    }

    const url = `${this.API_BASE}/register`;

    try {
      // 如果有头像文件，使用 FormData
      let resp: Response;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('phone', data.phone);
        formData.append('code', data.code);
        formData.append('userName', data.userName);
        formData.append('realName', data.realName);
        formData.append('idCardNumber', data.idCardNumber);
        formData.append('location', data.location);
        if (data.locationPlaceId) {
          formData.append('locationPlaceId', data.locationPlaceId);
        }
        formData.append('birthDate', data.birthDate);
        if (data.introduction)
          formData.append('introduction', data.introduction);
        formData.append('avatar', avatarFile);

        resp = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeader(),
          body: formData,
        });
      } else {
        // 没有头像，使用 JSON
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }

      const resData = await resp.json().catch(() => null);

      if (!resp.ok) {
        const err =
          resData?.error ||
          resData?.msg ||
          resp.statusText ||
          this.registerT.formRequired;

        const mapErr: Record<string, string> = {
          '手机号、验证码、用户名和真实姓名为必填项':
            this.registerT.formRequired,
          '手机号、验证码和用户名为必填项': this.registerT.formRequired,
          验证码错误: this.registerT.codeError,
          该手机号已注册: this.registerT.phoneExists,
          '注册信息重复，请检查手机号或身份证号': this.registerT.formRequired,
        };

        return {
          ok: false,
          status: resp.status,
          message: mapErr[err] || String(err),
        };
      }

      // 期望后端返回：{ success: true, user, token }
      if (resData?.success && resData?.user && resData?.token) {
        this.setSession({ token: String(resData.token), user: resData.user });
        return { ok: true };
      }

      return { ok: false, message: this.registerT.formRequired };
    } catch (err) {
      console.error('Register error:', err);
      return { ok: false, message: this.registerT.networkError };
    }
  }

  logout() {
    this.setSession(null);
  }

  async checkPhoneExists(phone: string): Promise<{ exists: boolean } | null> {
    if (!phone) return null;

    const url = `${this.API_BASE}/check-phone`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        console.error('checkPhoneExists failed:', data);
        return null;
      }

      if (data?.success && typeof data.exists === 'boolean') {
        return { exists: data.exists };
      }

      return null;
    } catch (err) {
      console.error('checkPhoneExists error:', err);
      return null;
    }
  }

  async sendVerificationCode(
    phone: string,
    captchaData?: {
      lot_number: string;
      captcha_output: string;
      pass_token: string;
      gen_time: string;
    } | null,
  ): Promise<{ success: boolean; message?: string; error?: string } | null> {
    if (!phone) return null;

    try {
      const body: any = { phone };
      if (captchaData) {
        body.lot_number = captchaData.lot_number;
        body.captcha_output = captchaData.captcha_output;
        body.pass_token = captchaData.pass_token;
        body.gen_time = captchaData.gen_time;
      }

      const resp = await fetch(`${this.API_BASE}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        return {
          success: false,
          error:
            data?.error ||
            data?.msg ||
            resp.statusText ||
            this.loginT.codeSendFailed,
        };
      }

      if (data?.success) {
        return {
          success: true,
          message: data?.message || this.loginT.codeSent,
        };
      }

      return {
        success: false,
        error: data?.error || this.loginT.codeSendFailed,
      };
    } catch (err) {
      console.error('sendVerificationCode error:', err);
      return {
        success: false,
        error: this.registerT.networkError,
      };
    }
  }

  async verifyVerificationCode(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; message?: string; error?: string } | null> {
    if (!phone || !code) return null;

    try {
      const resp = await fetch(`${this.API_BASE}/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        return {
          success: false,
          error:
            data?.error ||
            data?.msg ||
            resp.statusText ||
            this.loginT.captchaLoadFailed,
        };
      }

      if (data?.success) {
        return {
          success: true,
          message: data?.message || this.loginT.codeSent,
        };
      }

      return {
        success: false,
        error: data?.error || this.loginT.captchaLoadFailed,
      };
    } catch (err) {
      console.error('verifyVerificationCode error:', err);
      return {
        success: false,
        error: this.registerT.networkError,
      };
    }
  }

  async getProviderProfile(userId: number): Promise<ProviderProfile | null> {
    try {
      const res = await fetch(
        `${this.API_BASE}/api/provider-profile?userId=${userId}`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? (json.data as ProviderProfile) : null;
    } catch (e) {
      console.error('getProviderProfile error:', e);
      return null;
    }
  }

  // ----------------- 收藏 & 关注 -----------------
  async toggleFavorite(eventId: number): Promise<boolean | null> {
    try {
      const res = await fetch(`${this.API_BASE}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
        },
        body: JSON.stringify({ EventId: eventId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.success) return data.favorited;
      return null;
    } catch (e) {
      console.error('toggleFavorite error:', e);
      return null;
    }
  }

  async toggleFollow(followingId: number): Promise<boolean | null> {
    try {
      const res = await fetch(`${this.API_BASE}/follows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
        },
        body: JSON.stringify({ FollowingId: followingId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.success) return data.following;
      return null;
    } catch (e) {
      console.error('toggleFollow error:', e);
      return null;
    }
  }

  async checkFavorite(eventId: number): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.API_BASE}/favorites/check?eventId=${eventId}`,
        { headers: this.getAuthHeader() },
      );
      const data = await res.json().catch(() => null);
      return data?.favorited ?? false;
    } catch (e) {
      console.error('checkFavorite error:', e);
      return false;
    }
  }

  async checkFollow(userId: number): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.API_BASE}/follows/check?userId=${userId}`,
        { headers: this.getAuthHeader() },
      );
      const data = await res.json().catch(() => null);
      return data?.following ?? false;
    } catch (e) {
      console.error('checkFollow error:', e);
      return false;
    }
  }
}
