import { Injectable } from '@angular/core';
import { BehaviorSubject, map, distinctUntilChanged } from 'rxjs';
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
          请填写手机号和验证码: '请填写手机号和验证码',
          'Invalid verification code': '验证码错误',
          验证码错误: '验证码错误',
          'User not found': '该手机号未注册',
          该手机号未注册: '该手机号未注册',
          'Database query failed': '登录失败，数据库错误',
          '登录失败，数据库错误': '登录失败，数据库错误',
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

  async register(
    data: {
      phone: string;
      code: string;
      userName: string;
      realName: string;
      idCardNumber: string;
      location: string;
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
        message: '请填写所有必填项',
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
          resData?.error || resData?.msg || resp.statusText || '请求失败';

        const mapErr: Record<string, string> = {
          请填写所有必填项: '请填写所有必填项',
          '手机号、验证码、用户名和真实姓名为必填项': '请填写必填项',
          '手机号、验证码和用户名为必填项': '请填写必填项',
          验证码错误: '验证码错误',
          该手机号已注册: '该手机号已被注册，请直接登录',
          该身份证号已被注册: '该身份证号已被注册',
          '注册信息重复，请检查手机号或身份证号':
            '注册信息重复，请检查手机号或身份证号',
          '注册失败，数据库错误': '注册失败，数据库错误',
          '注册失败，请稍后重试': '注册失败，请稍后重试',
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

      return { ok: false, message: '注册失败：服务器返回格式异常' };
    } catch (err) {
      console.error('Register error:', err);
      return { ok: false, message: '无法连接到服务器（请确认后端已启动）' };
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
}
