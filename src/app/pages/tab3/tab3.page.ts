import {Component, inject} from '@angular/core';
//Standalone need to import specific component tag
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonList,
  IonAvatar,
  IonBadge,
  IonNote,
  IonLabel,
  } from '@ionic/angular/standalone';
import {Router} from '@angular/router';
import {NavController} from '@ionic/angular';


@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonItem,
    IonList,
    IonAvatar,
    IonBadge,
    IonNote,
    IonLabel,
  ],
  standalone: true,
})
export class Tab3Page {
  private router = inject(Router);
  private navCtrl = inject(NavController);

  //add room_id 1-2 注意这里的数据结构全部为模拟作用，并非实际情况，用户聊天数据库+ mysql对接待设计
  chatRooms = [
    { roomId:'room_001',name: 'User1-Room1', time: '13:29', lastMsg: 'Hello World', count: 1, avatar: 'assets/icon/user.svg' },
    { roomId:'room_001',name: 'User2-Room1', time: '14:30', lastMsg: '你好', count: 2, avatar: 'assets/icon/user.svg' },
    { roomId:'room_002',name: 'User1-Room2', time: '13:29', lastMsg: 'Hello World', count: 1, avatar: 'assets/icon/user.svg' },
    { roomId:'room_002',name: 'User2-Room2', time: '14:30', lastMsg: '你好', count: 2, avatar: 'assets/icon/user.svg' },
  ];

  //go to the chat with router
  goChat(user: any) {
    this.navCtrl.navigateForward(['/chat-detail', user.roomId], {
      state: { targetUser: user }
    });
  }
}
