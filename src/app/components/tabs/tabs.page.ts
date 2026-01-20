import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
//here import icons from ionic official!
import {
  homeOutline,
  searchOutline,
  chatbubblesOutline,
  personOutline,
  add,
  close,
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  public router = inject(Router);
  private navCtrl = inject(NavController);

  isTab5Active = false;

  constructor() {
    //use these icons, need name here and then use the name in HTML
    addIcons({
      'home-outline': homeOutline,
      'search-outline': searchOutline,
      'chatbubbles-outline': chatbubblesOutline,
      'person-outline': personOutline,
      add: add,
      close: close,
    });
  }

  onTab5Click(): void {
    if (this.isTab5Active) {
      // 关闭tab5，返回上一个页面
      this.isTab5Active = false;
      this.navCtrl.back();
    } else {
      // 激活tab5
      this.isTab5Active = true;
      this.router.navigate(['/tabs/tab5']);
    }
  }

  onTabChange(tabName: string): void {
    // 当切换到非tab5的页面时，重置tab5状态
    this.isTab5Active = tabName === 'tab5';
  }
}
