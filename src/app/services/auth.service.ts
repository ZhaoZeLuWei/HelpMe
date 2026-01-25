import { Injectable } from '@angular/core';
import { BehaviorSubject, map, distinctUntilChanged } from 'rxjs';
import { ProviderProfile } from '../models/provider-profile.model'; // ← 引入公共模型
import { environment } from '../../environments/environment';

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

  // 唯一真相：session（token + user）
  private readonly _session$ = new BehaviorSubject<Session | null>(
    this.readSessionFromStorage(),
  );

  /** 给页面订阅：获取完整 session（token+user） */
  public readonly session$ = this._session$.asObservable();

  /** 给页面订阅：是否已登录（由 token 推导） */
  public readonly isLoggedIn$ = this.session$.pipe(
    map((s) => !!s?.token),
    distinctUntilChanged(),
  );

  constructor() {}

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
    if (!phone || !code) return { ok: false, message: '请填写手机号和验证码' };

    const url = `${this.API_BASE}/login`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        const err = data?.error || data?.msg || resp.statusText || '请求失败';

        const mapErr: Record<string, string> = {
          'phone and code required': '请填写手机号和验证码',
          'Invalid verification code': '验证码错误',
          'User not found': '当前账号不存在（该手机号未注册）',
          'Database query failed': '服务器查询失败，请稍后再试',
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
        // 保留 user 也没意义（因为后续请求都没法鉴权），这里建议当失败处理更直观
        return {
          ok: false,
          message:
            '登录成功但服务器未返回 token（请检查后端 JWT 登录接口返回）',
        };
      }

      return { ok: false, message: '登录失败：服务器返回格式异常' };
    } catch (err) {
      console.error('Login error:', err);
      return { ok: false, message: '无法连接到服务器（请确认后端已启动）' };
    }
  }

  logout() {
    this.setSession(null);
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
