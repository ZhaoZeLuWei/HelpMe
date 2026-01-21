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

//Models( Data structure) imports here
import {ChatModel} from "../../models/chat.model";
import { ChatHistory } from "../../models/chatHistory.model";


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
  //check connection
  serverOffset = 0;
  //privates?
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  //get user info from chat list page
  targetUser: any;
  myself: any;
  roomId:string = "";

  //input checking before it send to node
  messageInput = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  ngOnInit() {
    //init room id and target user info HERE FROM chat list page
    const state = history.state;
    if (state && state.targetUser) {
      this.targetUser = state.targetUser;
      this.roomId = this.targetUser.roomId;
    }

    this.loadHistory(this.roomId);

    // Init Connection (Without JSON Web Token !!!)
    this.socket = io('http://localhost:3000', {
      //without auth !!!
      auth: { serverOffset: this.serverOffset }
    });

    //send JOIN room request to server
    this.socket.on('connect', () => {
      if(this.roomId){
        this.socket.emit('joinRoom', this.roomId);
        console.log("Joined room", this.roomId);
      }
    })

    //get myself user from Node
    this.socket.on('myself', (user:any) => {
      this.myself = user;
    })


    // step 2: receive msg from node and show it
    this.socket.on('chat message', (msg: ChatModel, offset?: number) => {
      this.addMessage(msg);
      if (offset) {
        this.serverOffset = offset;
        this.socket.auth.serverOffset = offset;
      }
    });

    // Check the room connection
    this.socket.on('connectSuccess', (msg: ChatModel) => {
      this.addMessage(msg);
    });
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
