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
  showChat: boolean | undefined;
  systemRoom : any = null;

  ngOnInit() {
    this.showChat = false;
    console.log(this.getUser);
  }

  ionViewWillEnter() {
    //init each time
    this.showChat = false;// web page HTML show check
    this.getUser = this.auth.currentUser;// user get check
    console.log(this.getUser);
    const sysRoom = `system_${this.getUser.UserId}`;
    if(this.getUser){
      this.initSystemRoom(sysRoom);
    }
    this.checkAuth();// do checking

  }

  //根据登陆用户信息来进入对应用户的通知聊天房间
  private initSystemRoom(sysRoom:any) {
    this.systemRoom = {
      roomId: sysRoom, // 现在这里不会是 undefined 了
      name: '系统通知',
      avatar: 'assets/icon/notification.svg',
      lastMsg: '暂无新通知',
      count: 0,
      type: 'system'
    }
  }

  private async checkAuth(){
    const token = this.auth.token;
    if(!token || !this.getUser){
      console.log("Please log in or Register");
      //简单粗暴的跳转到了登陆页 需要优化login page 1-23
      //wait to show toast at top and let user read the html contents then do navigation
      await this.loginToast();
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.navCtrl.navigateRoot('/tabs/tab4');
    }  else {
      this.showChat = true;
    }
  }

  //if user not login ,show a toast at the top of the screen ( all pages can see)
  private async loginToast() {
    const toast = await this.toastCtrl.create({
      message: '请您登录或注册',
      duration: 1000,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
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
