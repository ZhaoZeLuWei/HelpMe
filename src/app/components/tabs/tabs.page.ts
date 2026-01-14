import { Component, EnvironmentInjector, inject } from '@angular/core';
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
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

  constructor() {
    //use these icons, need name here and then use the name in HTML
    addIcons({
      'home-outline': homeOutline,
      'search-outline': searchOutline,
      'chatbubbles-outline': chatbubblesOutline,
      'person-outline': personOutline,
      'add': add,
    });
  }
}
