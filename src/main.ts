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
import { provideHttpClient } from '@angular/common/http';
import { ConfigService } from './app/services/config.service';

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
    provideHttpClient(),
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
