import {Component, OnDestroy, OnInit, signal, inject} from '@angular/core';
import {io} from 'socket.io-client';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonItem,
  IonFooter,
  IonInput,
  IonButton,
} from '@ionic/angular/standalone';
import { DatePipe } from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {HttpClient} from "@angular/common/http";
import {ToastController} from "@ionic/angular";

//Models( Data structure) imports here
import {ChatModel} from "../../models/chat.model";
import { ChatHistory } from "../../models/chatHistory.model";

//import Service
import {AuthService} from "../../services/auth.service";

@Component({
  selector: 'app-chat-detail',
  templateUrl: './chat-detail.page.html',
  styleUrls: ['./chat-detail.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonItem,
    IonFooter,
    IonInput,
    IonButtons,
    IonButton,
  ],
})
export class ChatDetailPage implements OnInit, OnDestroy {
  socket: any;
  //signal NEW in angular rather than RxJS
  messages = signal<ChatModel[]>([]);

  //injects (import)
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toastCtrl = inject(ToastController);

  //get user info from chat list page(Tab3)
  roomInfoTab3: any;
  myself: any; //from socket io
  roomId:string = "";
  getUserFromService: any;
  serverOffset = 0;

  //input checking before it send to node
  messageInput = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  ngOnInit() {
    //get user from Node server first
    this.getUserFromService = this.auth.currentUser;
    console.log(this.getUserFromService);

    //init room id from chat list page ,and use it to load all msg from this room
    const state = history.state;
    if (state && state.targetUser) {
      this.roomInfoTab3 = state.targetUser;
      this.roomId = this.roomInfoTab3.roomId;
    }
    this.loadHistory(this.roomId);

    // Init Connection (Without JSON Web Token !!!)
    this.socket = io('http://localhost:3000', {
      auth: {
        token: this.auth.token,
        serverOffset: this.serverOffset
      }
    });

    //get myself from socket io chat handler
    this.socket.on('myself', (user:any) => {
      this.myself = user;
      console.log(this.myself.id);
      console.log(this.myself.name);
    })

    //send JOIN room request to server
    this.socket.on('connect', () => {
      if(this.roomId){
        this.socket.emit('joinRoom', this.roomId);
        console.log("Joined room", this.roomId);
      }
    })

    // step 2: receive msg from node and show it
    this.socket.on('chat message', (msg: ChatModel, offset?: number) => {
      this.addMessage(msg);
      if (offset) {
        this.serverOffset = offset;
        this.socket.auth.serverOffset = offset;
      }
    });

    //tell user the connnection with this room chat finally success!!~~
    this.socket.on(
      'connectSuccess',
      async (msg: ChatModel) => {
        const toast = await this.toastCtrl.create({
          message: msg.text,
          duration: 500,
          position: 'top',
          color: 'light',
        });
        await toast.present();
      }
    );
  }

//load msg history by API using ROOM_ID from chat list page !
  loadHistory(roomId: string) {
    this.http
      .get<ChatHistory>(
        `http://localhost:3000/api/messages/history?roomId=${roomId}`
      )
      .subscribe({
        next: (res) => {
          if (!res.success) return;
          //rebuild the data structure into <messages> store
          console.log(res);
          const apiMsg: ChatModel[] = res.data.messages.map(msg => ({
            text: msg.text,
            senderId: msg.senderId,
            userName: msg.userName,
            sendTime: msg.sendTime,
          }));

          this.messages.set(apiMsg);

          // 如果你后面用 offset / ack
          //this.serverOffset = res.data.messages.length;
        },
        error: (err) => {
          console.error('加载历史消息失败', err);
        },
      });
  }

  // step 1: send the message user input in client
  sendMessage() {
    const checkMsg = this.messageInput.value;

    //check if the input not null and not only space
    if (checkMsg && checkMsg.trim()) {
      // only send text; server will attach sender identity
      this.socket.emit('chat message', {
        text: checkMsg
      });
      this.messageInput.reset();
    }
  }

  //在messages这个数据结构中，继续顺序添加新的msg
  private addMessage(msg: ChatModel) {
    this.messages.update(prev => [...prev, msg]);
  }

  ngOnDestroy() {
    // 离开页面时断开连接，防止内存泄漏
    if (this.socket) {
      this.socket.disconnect();
    }
  }

}
