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
import {ChatModel} from "../models/chat.model";
import { DatePipe } from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";


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
  serverOffset = 0;
  private route = inject(ActivatedRoute);

  //get user info from chat list page
  targetUser: any;
  roomId :string | null = null;

  //这是一个浏览器当前模拟的客户身份
  currentUser = {
    id: 'user_' + Math.floor(Math.random() * 1000), // 随机生成一个ID
    name: '华为用户',
  }

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
      console.log(state.targetUser);
      console.log(this.roomId);
      console.log("Get target user from chat lists⬆️")
    }

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

    // Check the room connection
    this.socket.on('connectSuccess', (msg: ChatModel) => {
      this.addMessage(msg);
    });

    // step 2: receive msg from node and show it
    this.socket.on('chat message', (msg: ChatModel, offset?: number) => {
      this.addMessage(msg);
      if (offset) {
        this.serverOffset = offset;
        this.socket.auth.serverOffset = offset;
      }
    });
  }

  // step 1: send the message user input in client
  sendMessage() {
    const checkMsg = this.messageInput.value;

    //check if the input not null and not only space
    if (checkMsg && checkMsg.trim()) {
      const newMsg: ChatModel = {
        text: checkMsg,
        senderId: this.currentUser.id,
        userName: this.currentUser.name,
        timestamp: new Date(),
      }
      //send msg to server
      this.socket.emit('chat message', newMsg);
      //clean all inputs from client site
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
