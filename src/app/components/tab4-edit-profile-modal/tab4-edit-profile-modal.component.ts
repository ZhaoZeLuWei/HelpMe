import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { LocationPickerService } from '../../services/location-picker.service';
import { UploadService } from '../../services/upload.service';
import { environment } from '../../../environments/environment';
import { resolveMediaUrl } from '../../utils/media-url.util';

export type Tab4ProfileSavedPayload = {
  UserName: string;
  RealName: string;
  IdCardNumber: string;
  Location: string;
  LocationPlaceId: string;
  LocationLng: number | null;
  LocationLat: number | null;
  BirthDate: string;
  Introduction: string;
  UserAvatar?: string | null;
};

@Component({
  selector: 'app-tab4-edit-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonNote,
    IonIcon,
  ],
  templateUrl: './tab4-edit-profile-modal.component.html',
  styleUrl: './tab4-edit-profile-modal.component.scss',
})
export class Tab4EditProfileModalComponent implements OnChanges {
  private readonly apiBase = environment.apiBase;
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly locationPicker = inject(LocationPickerService);
  private readonly uploadService = inject(UploadService);
  private readonly toastController = inject(ToastController);

  @Input() isOpen = false;
  @Input() userInfo: any;
  @Input() userId: number | null = null;
  @Input() t: any;

  @Output() didDismiss = new EventEmitter<void>();
  @Output() profileSaved = new EventEmitter<Tab4ProfileSavedPayload>();

  @ViewChild('profileAvatarInput')
  profileAvatarInput!: ElementRef<HTMLInputElement>;

  isSaving = false;
  avatarPreview: string | null = null;
  avatarFile: File | null = null;
  avatarDeleted = false;

  form: FormGroup = this.fb.group({
    UserName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(20)],
    ],
    RealName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(20)],
    ],
    IdCardNumber: [
      '',
      [
        Validators.required,
        Validators.pattern(
          /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/,
        ),
      ],
    ],
    Location: ['', Validators.required],
    LocationPlaceId: [''],
    LocationLng: [null as number | null],
    LocationLat: [null as number | null],
    BirthDate: ['', Validators.required],
    Introduction: ['', Validators.maxLength(200)],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true && this.userInfo) {
      this.resetFormFromUser();
    }
  }

  onDismiss(): void {
    this.cleanupAvatarPreview();
    this.didDismiss.emit();
  }

  getAssetUrl(path: string): string {
    return resolveMediaUrl(path, '');
  }

  triggerAvatarInput(): void {
    this.profileAvatarInput?.nativeElement.click();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      void this.showToast('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      void this.showToast('Image size cannot exceed 5MB');
      return;
    }

    this.avatarFile = file;
    this.avatarPreview = URL.createObjectURL(file);
    this.avatarDeleted = false;
    input.value = '';
  }

  removeAvatar(): void {
    this.cleanupAvatarPreview();
    this.avatarFile = null;
    this.avatarDeleted = true;
    if (this.profileAvatarInput?.nativeElement) {
      this.profileAvatarInput.nativeElement.value = '';
    }
  }

  async openLocationPicker(): Promise<void> {
    const picked = await this.locationPicker.pickLocation({
      selectedPlaceId: this.form.get('LocationPlaceId')?.value || '',
      selectedText: this.form.get('Location')?.value || '',
    });
    if (!picked) return;

    this.form.patchValue({
      Location: picked.text,
      LocationPlaceId: picked.placeId,
      LocationLng: picked.lng,
      LocationLat: picked.lat,
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      const errors: string[] = [];
      if (this.form.get('UserName')?.invalid)
        errors.push(`${this.t.userNameLabel} ${this.t.userNamePlaceholder}`);
      if (this.form.get('RealName')?.invalid)
        errors.push(`${this.t.realNameLabel} ${this.t.realNamePlaceholder}`);
      if (this.form.get('IdCardNumber')?.invalid)
        errors.push(this.t.idCardPlaceholder);
      if (this.form.get('Location')?.invalid)
        errors.push(this.t.locationLabelProfile);
      if (this.form.get('BirthDate')?.invalid)
        errors.push(this.t.birthDateLabel);
      if (this.form.get('Introduction')?.invalid)
        errors.push(this.t.introPlaceholder);
      await this.showToast(errors.join('，'));
      return;
    }

    if (!this.userId) {
      await this.showToast(this.t.notLoggedIn);
      return;
    }

    if (this.isSaving) return;
    this.isSaving = true;

    let avatarPath: string | null = null;

    try {
      if (this.avatarFile) {
        avatarPath = await this.uploadAvatar();
        if (!avatarPath) {
          return;
        }
      }

      const payload: Tab4ProfileSavedPayload = {
        UserName: this.form.value.UserName,
        RealName: this.form.value.RealName,
        IdCardNumber: this.form.value.IdCardNumber,
        Location: this.form.value.Location,
        LocationPlaceId: this.form.value.LocationPlaceId || '',
        LocationLng: this.form.value.LocationLng ?? null,
        LocationLat: this.form.value.LocationLat ?? null,
        BirthDate: this.form.value.BirthDate,
        Introduction: this.form.value.Introduction || '',
      };

      if (avatarPath) {
        payload.UserAvatar = avatarPath;
      } else if (this.avatarDeleted) {
        payload.UserAvatar = null;
      }

      const resp = await fetch(`${this.apiBase}/users/${this.userId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.auth.getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        if (resp.status === 401) {
          if (avatarPath) await this.deleteUploadedFile(avatarPath);
          await this.auth.handleAuthExpired();
          return;
        }
        if (avatarPath) await this.deleteUploadedFile(avatarPath);
        await this.showToast(
          data?.error || data?.msg || `保存失败（${resp.status}）`,
        );
        return;
      }

      await this.showToast(this.t.saveSuccess);
      this.profileSaved.emit(payload);
      this.onDismiss();
    } catch (e) {
      console.error('submitProfileEdit error', e);
      if (avatarPath) await this.deleteUploadedFile(avatarPath);
      await this.showToast(this.t.networkError);
    } finally {
      this.isSaving = false;
    }
  }

  private resetFormFromUser(): void {
    const u = this.userInfo || {};
    this.form.reset({
      UserName: u.name || '',
      RealName: u.realName || '',
      IdCardNumber: u.idCardNumber || '',
      Location: u.location || '',
      LocationPlaceId: u.locationPlaceId || '',
      LocationLng: u.locationLng != null ? Number(u.locationLng) : null,
      LocationLat: u.locationLat != null ? Number(u.locationLat) : null,
      BirthDate: u.birthDate || '',
      Introduction: u.introduction || '',
    });
    this.cleanupAvatarPreview();
    this.avatarFile = null;
    this.avatarDeleted = false;
  }

  private cleanupAvatarPreview(): void {
    if (this.avatarPreview) {
      URL.revokeObjectURL(this.avatarPreview);
    }
    this.avatarPreview = null;
  }

  private async uploadAvatar(): Promise<string | null> {
    if (!this.avatarFile) return null;

    try {
      const paths = await this.uploadService.uploadImages(this.avatarFile);
      return paths[0] || null;
    } catch (e) {
      console.error('uploadProfileAvatar error', e);
      await this.showToast(
        e instanceof Error ? e.message : this.t.networkError,
      );
      return null;
    }
  }

  private async deleteUploadedFile(filePath: string): Promise<void> {
    await this.uploadService.deleteUploadedFile(filePath);
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1500,
      position: 'bottom',
      positionAnchor: 'main-tab-bar',
    });
    await toast.present();
  }
}
