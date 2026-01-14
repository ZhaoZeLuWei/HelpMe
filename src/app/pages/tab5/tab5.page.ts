import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonText,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  handLeftOutline,
  heartOutline,
  shieldCheckmarkOutline,
  imageOutline,
  addCircleOutline,
  closeCircle,
} from 'ionicons/icons';

@Component({
  selector: 'app-tab5',
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonText,
    IonModal,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
  ],
})
export class Tab5Page implements OnInit {
  showRequestModal = false;
  showHelpModal = false;
  showIdentityModal = false;

  requestPhotos: string[] = [];
  helpPhotos: string[] = [];
  idCardPhotos: string[] = [];
  certPhotos: string[] = [];

  requestForm!: FormGroup;
  helpForm!: FormGroup;
  identityForm!: FormGroup;

  @ViewChild('requestFileInput')
  requestFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('helpFileInput') helpFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('idCardFileInput') idCardFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('certFileInput') certFileInput!: ElementRef<HTMLInputElement>;

  readonly IDCARD_MAX = 2;
  readonly CERT_MAX = 3;

  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly navCtrl = inject(NavController);

  constructor() {
    addIcons({
      handLeftOutline,
      heartOutline,
      shieldCheckmarkOutline,
      close,
      imageOutline,
      addCircleOutline,
      closeCircle,
    });
  }

  ngOnInit() {
    this.requestForm = this.formBuilder.group({
      EventTitle: ['', Validators.required],
      EventType: [0],
      EventCategory: ['', Validators.required],
      Location: ['', Validators.required],
      Price: [0, [Validators.min(0)]],
      EventDetails: ['', Validators.required],
    });

    this.helpForm = this.formBuilder.group({
      EventTitle: ['', Validators.required],
      EventType: [1],
      EventCategory: ['', Validators.required],
      Location: ['', Validators.required],
      Price: [0, [Validators.required, Validators.min(0)]],
      EventDetails: ['', Validators.required],
    });

    this.identityForm = this.formBuilder.group({
      RealName: ['', Validators.required],
      PhoneNumber: [
        '',
        [Validators.required, Validators.pattern(/^1[3-9]\d{9}$/)],
      ],
      IdCardNumber: [
        '',
        [Validators.required, Validators.pattern(/^(\d{18}|\d{17}[\dXx])$/)],
      ],
      Location: ['', Validators.required],
      ProviderRole: ['', [Validators.required, Validators.pattern(/^[123]$/)]],
      Introduction: [''],
      IdCardPhotosPresent: [false, Validators.requiredTrue],
      CertPhotosPresent: [false, Validators.requiredTrue],
    });
  }

  navigateToRequest() {
    this.showRequestModal = true;
  }

  navigateToSupport() {
    this.showHelpModal = true;
  }

  navigateToIdentitySelection() {
    this.showIdentityModal = true;
  }

  triggerFileInput(type: 'request' | 'help' | 'idcard' | 'cert'): void {
    let photos: string[];
    let input: ElementRef<HTMLInputElement>;
    let max = 5;

    if (type === 'request') {
      photos = this.requestPhotos;
      input = this.requestFileInput;
    } else if (type === 'help') {
      photos = this.helpPhotos;
      input = this.helpFileInput;
    } else if (type === 'idcard') {
      photos = this.idCardPhotos;
      input = this.idCardFileInput;
      max = this.IDCARD_MAX;
    } else {
      photos = this.certPhotos;
      input = this.certFileInput;
      max = this.CERT_MAX;
    }

    if (photos.length >= max) return;
    input.nativeElement.click();
  }

  onFileSelected(
    event: Event,
    type: 'request' | 'help' | 'idcard' | 'cert',
  ): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    let photos: string[];
    let max = 5;

    if (type === 'request') {
      photos = this.requestPhotos;
    } else if (type === 'help') {
      photos = this.helpPhotos;
    } else if (type === 'idcard') {
      photos = this.idCardPhotos;
      max = this.IDCARD_MAX;
    } else {
      photos = this.certPhotos;
      max = this.CERT_MAX;
    }

    const remaining = max - photos.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;

        if (type === 'request') {
          this.requestPhotos.push(result);
        } else if (type === 'help') {
          this.helpPhotos.push(result);
        } else if (type === 'idcard') {
          this.idCardPhotos.push(result);
          if (this.identityForm) {
            this.identityForm.patchValue({
              IdCardPhotosPresent: this.idCardPhotos.length > 0,
            });
          }
        } else {
          this.certPhotos.push(result);
          if (this.identityForm) {
            this.identityForm.patchValue({
              CertPhotosPresent: this.certPhotos.length > 0,
            });
          }
        }
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  removePhoto(
    index: number,
    type: 'request' | 'help' | 'idcard' | 'cert',
  ): void {
    if (type === 'request') {
      this.requestPhotos.splice(index, 1);
    } else if (type === 'help') {
      this.helpPhotos.splice(index, 1);
    } else if (type === 'idcard') {
      this.idCardPhotos.splice(index, 1);
      if (this.identityForm) {
        this.identityForm.patchValue({
          IdCardPhotosPresent: this.idCardPhotos.length > 0,
        });
      }
    } else {
      this.certPhotos.splice(index, 1);
      if (this.identityForm) {
        this.identityForm.patchValue({
          CertPhotosPresent: this.certPhotos.length > 0,
        });
      }
    }
  }

  submitRequest(): void {
    if (this.requestForm.valid) {
      const data = { ...this.requestForm.value };
      data.Photos =
        this.requestPhotos.length > 0
          ? JSON.stringify(this.requestPhotos)
          : null;

      console.log('提交求助:', data);
      this.showRequestModal = false;
      this.requestPhotos = [];
    }
  }

  submitHelp(): void {
    if (this.helpForm.valid) {
      const data = { ...this.helpForm.value };
      data.Photos =
        this.helpPhotos.length > 0 ? JSON.stringify(this.helpPhotos) : null;

      console.log('提交帮助:', data);
      this.showHelpModal = false;
      this.helpPhotos = [];
    }
  }

  submitIdentity(): void {
    if (this.identityForm.valid) {
      const data = { ...this.identityForm.value };
      data.ProviderRole = Number(data.ProviderRole);
      data.IdCardPhotos =
        this.idCardPhotos.length > 0 ? JSON.stringify(this.idCardPhotos) : null;
      data.CertPhotos =
        this.certPhotos.length > 0 ? JSON.stringify(this.certPhotos) : null;

      console.log('提交认证:', data);
      this.showIdentityModal = false;
    }
  }

  closeGuide(): void {
    if (window.history.length > 1) {
      this.navCtrl.back();
    } else {
      this.router.navigate(['/tabs/tab1']);
    }
  }
}
