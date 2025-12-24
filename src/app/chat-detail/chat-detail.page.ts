import {Component, OnDestroy, OnInit, signal,} from '@angular/core';
import {io} from 'socket.io-client';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonFooter, IonInput, IonButton,
} from '@ionic/angular/standalone';


@Component({
  selector: 'app-chat-detail',
  templateUrl: './chat-detail.page.html',
  styleUrls: ['./chat-detail.page.scss'],
  standalone: true,
  imports: [ReactiveFormsModule,IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton
    , IonList, IonItem, IonFooter, IonInput, IonButtons, IonButton],
})
export class ChatDetailPage implements OnInit, OnDestroy {
  socket: any;
  //signal NEW in angular rather than RxJS
  messages = signal<string[]>([]);
  serverOffset = 0;

  //input checking before it send to node
  messageInput = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  ngOnInit() {

    // Init Connection (Without JSON Web Token !!!)
    this.socket = io('http://localhost:3000', {
      //without auth !!!
      auth: { serverOffset: this.serverOffset }
    });

    // Check the connection
    this.socket.on('connectSuccess', (msg: string) => {
      this.addMessage(msg);
    });

    // step 2: receive msg from node and show it
    this.socket.on('chat message', (msg: string, offset?: number) => {
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
      //send msg to server
      this.socket.emit('chat message', checkMsg.trim());
      //clean all inputs from client site
      this.messageInput.reset();
    }
  }

  //在messages这个数据结构中，继续顺序添加新的msg
  private addMessage(msg: string) {
    this.messages.update(prev => [...prev, msg]);
  }

  ngOnDestroy() {
    // 离开页面时断开连接，防止内存泄漏
    if (this.socket) {
      this.socket.disconnect();
    }
  }

}
