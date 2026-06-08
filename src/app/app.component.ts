import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    // 启动时恢复长辈模式状态
    const savedElderly = localStorage.getItem('elderly_mode');
    if (savedElderly === 'true') {
      document.body.classList.add('elderly-mode');
    }
  }
}
