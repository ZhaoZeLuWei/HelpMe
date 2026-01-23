import {Component,OnInit, inject} from '@angular/core';
import { AuthService } from "../../services/auth.service";
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
import {NavController, ToastController} from '@ionic/angular';


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
export class Tab3Page implements OnInit {
  //injects
  private navCtrl = inject(NavController);
  private auth = inject(AuthService);
  private toastCtrl = inject(ToastController);

  //variables
  getUser: any;
  showChat: boolean = false;

  ngOnInit() {
    console.log(this.getUser);
  }

  ionViewWillEnter() {
    this.getUser = this.auth.currentUser;
    this.checkAuth();
  }

  private async checkAuth(){
    const token = this.auth.token;
    if(!token || !this.getUser){
      console.log("Please log in or Register");
      //简单粗暴的跳转到了登陆页 需要优化login page 1-23
      await this.loginToast();
      this.navCtrl.navigateRoot('/tabs/tab4');
    }
  }

  private async loginToast() {
    const toast = await this.toastCtrl.create({
      message: '请您登录或注册',
      duration: 3000,
      position: 'top',
      color: 'warning',
    });
    await toast.present();
  }

  //add room_id 1-2 注意这里的数据结构全部为模拟作用，并非实际情况，用户聊天数据库+ mysql对接待设计
  chatRooms = [
    { roomId:'room_001',name: 'User1-Room1', time: '13:29', lastMsg: 'Hello World', count: 1, avatar: 'assets/icon/user.svg' },
    { roomId:'room_001',name: 'User2-Room1', time: '14:30', lastMsg: '你好', count: 2, avatar: 'assets/icon/user.svg' },
  ];

  //go to the chat with router
  goChat(user: any) {
    this.navCtrl.navigateForward(['/chat-detail', user.roomId], {
      state: { targetUser: user }
    });
  }
}
