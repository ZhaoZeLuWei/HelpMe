import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab4-login-prompt',
  standalone: true,
  imports: [IonIcon, IonButton],
  templateUrl: './tab4-login-prompt.component.html',
  styleUrl: './tab4-login-prompt.component.scss',
})
export class Tab4LoginPromptComponent {
  @Input() t: any;
  @Output() login = new EventEmitter<void>();
  @Output() register = new EventEmitter<void>();
}
