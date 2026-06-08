import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

type AliyunCaptchaValidate = {
  lot_number: string;
  captcha_output: string;
  pass_token: string;
  gen_time: string;
} | null;

declare global {
  interface Window {
    initAlicom4?: (config: any, callback: (captchaObj: any) => void) => void;
  }
}

/** 同一时刻仅允许一个图形验证会话，避免连点弹出多个验证码窗口 */
export const CAPTCHA_BUSY_ERROR = 'CAPTCHA_BUSY';

@Injectable({ providedIn: 'root' })
export class AliyunCaptchaService {
  private loadingPromise: Promise<void> | null = null;
  private activeValidatePromise: Promise<AliyunCaptchaValidate> | null = null;

  private get captchaScriptUrl(): string {
    return (environment as any).captchaScriptUrl || '';
  }

  private get captchaId(): string {
    return (environment as any).captchaId || '';
  }

  private loadScript(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('当前环境不支持图形验证码'));
        return;
      }

      // 如果页面已提前注入 ct4.js，直接复用，避免因未配置 URL 报错
      if (window.initAlicom4) {
        resolve();
        return;
      }

      if (!this.captchaScriptUrl) {
        reject(new Error('未配置图形验证码脚本地址'));
        return;
      }

      const existing = document.querySelector(
        `script[data-aliyun-captcha="true"]`,
      ) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('图形验证码脚本加载失败')),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.charset = 'utf-8';
      script.async = true;
      script.src = this.captchaScriptUrl;
      script.dataset['aliyunCaptcha'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('图形验证码脚本加载失败'));
      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  async getValidate(): Promise<AliyunCaptchaValidate> {
    if (this.activeValidatePromise) {
      throw new Error(CAPTCHA_BUSY_ERROR);
    }

    if (!this.captchaId) {
      throw new Error('未配置 captchaId');
    }

    await this.loadScript();

    this.activeValidatePromise = this.openCaptchaSession();
    try {
      return await this.activeValidatePromise;
    } finally {
      this.activeValidatePromise = null;
    }
  }

  private openCaptchaSession(): Promise<AliyunCaptchaValidate> {
    return new Promise<AliyunCaptchaValidate>((resolve, reject) => {
      if (!window.initAlicom4) {
        reject(new Error('阿里云图形验证码 SDK 未初始化'));
        return;
      }

      let captchaObj: any = null;
      let settled = false; // 防止重复 resolve/reject
      let shown = false; // 防止重复弹出

      window.initAlicom4(
        {
          captchaId: this.captchaId,
          product: 'bind',
        },
        (obj: any) => {
          captchaObj = obj;

          captchaObj.onSuccess(() => {
            if (settled) return;
            settled = true;
            const result = captchaObj.getValidate?.();
            if (
              result &&
              result.lot_number &&
              result.captcha_output &&
              result.pass_token &&
              result.gen_time
            ) {
              resolve({
                lot_number: String(result.lot_number),
                captcha_output: String(result.captcha_output),
                pass_token: String(result.pass_token),
                gen_time: String(result.gen_time),
              });
            } else {
              resolve(null);
            }
            captchaObj?.destroy?.();
          });

          captchaObj.onClose?.(() => {
            if (settled) return;
            settled = true;
            captchaObj?.destroy?.();
            resolve(null);
          });

          captchaObj.onError?.((error: any) => {
            if (settled) return;
            settled = true;
            captchaObj?.destroy?.();
            reject(new Error(error?.msg || '图形验证码加载失败'));
          });

          // 仅在 onNextReady 时弹出一次，避免 onReady 和 onNextReady 重复触发
          captchaObj.onNextReady?.(() => {
            if (shown || settled) return;
            shown = true;
            captchaObj.showCaptcha?.();
          });
        },
      );
    });
  }
}
