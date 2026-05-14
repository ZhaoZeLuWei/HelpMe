import { bootstrapApplication } from '@angular/platform-browser';
import { APP_INITIALIZER } from '@angular/core';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

/* 1. 导入图标 */
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  heartOutline,
  starOutline,
  chatbubbleOutline,
  locationOutline,
  timeOutline,
  cashOutline,
  documentText,
} from 'ionicons/icons';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ConfigService } from './app/services/config.service';
import { langInterceptor } from './app/services/lang.interceptor';

// 全局 fetch 补丁：自动附加 lang 参数到 API 请求
const _originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  const lang = localStorage.getItem('app_lang') || 'zh';
  if (lang !== 'zh') {
    let urlStr: string;
    if (typeof input === 'string') {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else {
      urlStr = input.url;
    }
    if (urlStr.includes('/api/') || urlStr.includes('/events/') || urlStr.includes('/users/') ||
        urlStr.includes('/favorites') || urlStr.includes('/follows') || urlStr.includes('/reviews') ||
        urlStr.includes('/orders')) {
      const sep = urlStr.includes('?') ? '&' : '?';
      const newUrl = `${urlStr}${sep}lang=${lang}`;
      if (typeof input === 'string') {
        input = newUrl;
      } else if (input instanceof Request) {
        return _originalFetch(new Request(newUrl, input), init);
      }
    }
  }
  return _originalFetch(input, init);
};

/* 2. 一次性注册全局图标 */
addIcons({
  'chevron-back-outline': chevronBackOutline,
  'heart-outline': heartOutline,
  'star-outline': starOutline,
  'chatbubble-outline': chatbubbleOutline,
  'location-outline': locationOutline,
  'time-outline': timeOutline,
  'cash-outline': cashOutline,
  'document-text': documentText,
});

/**
 * 应用初始化工厂函数
 * 在应用启动前加载配置（包括高德地图初始化）
 */
function initializeApp(configService: ConfigService) {
  return () => configService.loadConfig();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideHttpClient(withInterceptors([langInterceptor])),
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true,
    },
  ],
});
