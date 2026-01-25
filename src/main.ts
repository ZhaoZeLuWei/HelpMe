import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

/* 1. 导入图标 */
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  heartOutline,
  starOutline,
  chatbubbleOutline,
  locationOutline,
  timeOutline,
  cashOutline
} from 'ionicons/icons';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import {provideHttpClient} from "@angular/common/http";

/* 2. 一次性注册全局图标 */
addIcons({
  'chevron-back-outline': chevronBackOutline,
  'heart-outline': heartOutline,
  'star-outline': starOutline,
  'chatbubble-outline': chatbubbleOutline,
  'location-outline': locationOutline,
  'time-outline': timeOutline,
  'cash-outline': cashOutline
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideHttpClient(),
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
