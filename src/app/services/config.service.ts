import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AppConfig {
  amap: {
    key: string;
    securityJsCode: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private config: AppConfig | null = null;
  private loadPromise: Promise<void> | null = null;

  /**
   * 从后端 API 获取配置（运行时加载，不打包进构建产物）
   */
  async loadConfig(): Promise<void> {
    if (this.config) {
      return;
    }

    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }

    this.loadPromise = this.fetchConfig();
    await this.loadPromise;
  }

  private async fetchConfig(): Promise<void> {
    const apiBase = environment.apiBase || '';
    const url = `${apiBase}/api/config`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`配置请求失败: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.config) {
        this.config = data.config;
        // 配置加载成功后，初始化高德地图
        this.initAmap();
      } else {
        throw new Error('配置响应格式错误');
      }
    } catch (error) {
      console.error('加载应用配置失败:', error);
      // 使用空配置，避免应用崩溃
      this.config = { amap: { key: '', securityJsCode: '' } };
    }
  }

  /**
   * 动态初始化高德地图（配置加载后调用）
   */
  private initAmap(): void {
    if (!this.config?.amap?.key) {
      console.warn('高德地图 Key 未配置，跳过加载');
      return;
    }

    // 设置高德安全密钥
    (window as any)._AMapSecurityConfig = {
      securityJsCode: this.config.amap.securityJsCode || '',
    };

    // 动态加载高德地图 JS API
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${this.config.amap.key}`;
    script.async = true;
    script.onerror = () => {
      console.error('高德地图加载失败');
    };
    document.head.appendChild(script);
  }

  getConfig(): AppConfig | null {
    return this.config;
  }

  getAmapKey(): string {
    return this.config?.amap?.key || '';
  }

  getAmapSecurityCode(): string {
    return this.config?.amap?.securityJsCode || '';
  }
}
