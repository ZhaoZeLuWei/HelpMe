import {Component, OnInit, inject} from '@angular/core';
import { AuthService } from "../../services/auth.service";
import {io} from 'socket.io-client';
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
import {LanguageService} from '../../services/language.service';

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
  private langService = inject(LanguageService);

  //variables
  socket: any;
  serverOffset = 0;
  getUser: any;
  showChat: boolean | undefined;
  systemRoom : any = null;
  //init chat rooms (nothing)
  chatRooms: any[] = [];

  // 翻译对象
  t = this.langService.getTranslations('zh').tab3;

  ngOnInit() {
    this.showChat = false;
    console.log(this.getUser);

    // Init Connection
    //用户独享socket 房间 ，用于实时更新聊天列表 ！！！（重要突破）
    this.socket = io('http://localhost:3000', {
      auth: {
        token: this.auth.token,
        serverOffset: this.serverOffset
      }
    });

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

      this.socket.emit('joinRoom', null);
      this.socket.off('listUpdate');

      //start listen list update from socket
      //重要突破 使用socket 在这里监听每一次消息变化情况！！（重要）
      this.socket.on ('listUpdate', (data:any) => {
        console.log("new chat list update!" , data);
        if (this.getUser?.UserId) {
          this.loadUserRooms(this.getUser.UserId);
        }
      })
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

          if (room.type === 'system' || room._id.startsWith('system_')) {
            name = this.t.systemNotification;
            avatar = 'assets/icon/notification.svg';
          } else {
            name = `${this.t.unknownUser} ${room.partnerId}`; // 或者后续调用用户接口获取真实昵称
            avatar = 'assets/icon/user.svg';
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
      console.error(this.t.loadRoomsFailed, err);
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
      name: this.t.systemNotification,
      avatar: 'assets/icon/notification.svg',
      lastMsg: this.t.noNewNotification,
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
      message: this.t.loginToast,
      duration: 1000,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
      color: 'warning',
    });
    await toast.present();
  }

  //go to the chat with router
  goChat(user: any) {
    this.clearRoomUnread(user.roomId);
    
    this.navCtrl.navigateForward(['/chat-detail', user.roomId], {
      state: { targetUser: user }
    });
  }

  formatChatTime(time: string | Date): string {
    const now = new Date();
    const target = new Date(time);

    const diff = (now.getTime() - target.getTime()) / 1000;

    if (diff < 60) return 'Just now';

    const isToday = now.toDateString() === target.toDateString();

    if (isToday) {
      return target.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    if (yesterday.toDateString() === target.toDateString()) {
      return 'Yesterday ' + target.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const isSameYear = now.getFullYear() === target.getFullYear();

    if (isSameYear) {
      return target.toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      }) + ' ' + target.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return target.toLocaleDateString();
  }

  private clearRoomUnread(roomId: string) {
    const room = this.chatRooms.find(r => r.roomId === roomId);
    if (room) {
      room.count = 0; // 本地红点清零
    }
  }
}
