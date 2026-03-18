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
import {sad} from "ionicons/icons";

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
  //init chat rooms (nothing)
  chatRooms: any[] = [];

  ngOnInit() {
    this.showChat = false;
    console.log(this.getUser);
  }

  ionViewWillEnter() {
    //init each time
    this.showChat = false;// web page HTML show check
    this.getUser = this.auth.currentUser;// user get check
    console.log(this.getUser);

    if(this.getUser){
      //init system room
      const sysRoom = `system_${this.getUser.UserId ?? this.getUser.UserId}`;
      this.initSystemRoom(sysRoom);

      //get all rooms with the target user
      this.loadUserRooms(this.getUser.UserId);
      console.log(this.chatRooms);
    }
    this.checkAuth();// do checking
  }

  //line 67 68 use api to get all list?
  async loadUserRooms(userId: number) {
    try {
      const query = new URLSearchParams({ userId: String(userId) }).toString(); // query = "userId=100002"
      const resp = await fetch(`http://localhost:3000/api/rooms/list?${query}`); // 正确拼接 URL
      const data = await resp.json();
      console.log(data);

      if (data?.success && Array.isArray(data.data?.rooms)) {
        this.chatRooms = data.data.rooms.map((room: any) => {
          let name = '';
          let avatar = '';
          let eventName = '';
          let otherChatName = '';

          if (
            room.type === 'system' ||
            (room._id && room._id.startsWith('system_'))
          ){
            name = '系统通知';
            avatar = 'assets/icon/notification.svg';
          } else {
            eventName = room.event.name;
            if(room.userA.id !== this.getUser.UserId) {
              otherChatName = room.userA.name;
              avatar = room.userA.avatar;
            }else if (room.userB.id !== this.getUser.UserId) {
              otherChatName = room.userB.name;
              avatar = room.userB.avatar;
            }
            name = otherChatName + " " + eventName;
          }

          const unreadCount = room.unreadCount?.[this.getUser.UserId] || 0;

          return {
            roomId: room.roomId,
            name,
            lastMsg: room.lastMsg || '暂无消息',
            count: unreadCount,
            avatar,
            type: room.type || 'user',
            updatedAt: room.updatedAt
          };
        });

        // 可选：按更新时间排序
        this.chatRooms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        console.log(this.chatRooms);
        this.showChat = true;
      }
    } catch (err) {
      console.error('加载聊天房间失败', err);
    }
  }

  getAvatarUrl(path: string): string {
    if (!path) return '';
    return path.startsWith('http') ? path : `http://localhost:3000${path}`;
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
      await new Promise(resolve => setTimeout(resolve, 200));
      this.navCtrl.navigateRoot('/tabs/tab4', {animated: true});
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

  //go to the chat with router
  goChat(user: any) {
    this.navCtrl.navigateForward(['/chat-detail', user.roomId], {
      state: { targetUser: user }
    });
  }
}
