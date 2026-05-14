import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { closeCircle, imageOutline, addCircleOutline } from 'ionicons/icons';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonNote,
  IonText,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../services/language.service';

export interface EventEditData {
  id: string | number;
  EventTitle: string;
  EventType: number;
  EventCategory: string;
  Location: string;
  LocationPlaceId?: string;
  LocationLng?: number | null;
  LocationLat?: number | null;
  Price: number;
  EventDetails: string;
  Photos?: string | string[] | null;
}

/** 提交给父组件的编辑载荷 */
export interface EditEventPayload {
  formData: Record<string, any>;
  photosJson: string | null;
}

@Component({
  selector: 'app-edit-event-modal',
  templateUrl: './edit-event-modal.component.html',
  styleUrls: ['./edit-event-modal.component.scss'],
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
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonNote,
    IonText,
  ],
})
export class EditEventModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() eventData: EventEditData | null = null;
  @Input() isSaving = false;

  @Output() didDismiss = new EventEmitter<void>();
  @Output() save = new EventEmitter<EditEventPayload>();
  @Output() openLocationPicker = new EventEmitter<string>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private readonly API_BASE = environment.apiBase;
  private readonly EDIT_MAX = 5;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  editForm: FormGroup;
  existingPhotos: string[] = [];
  newPhotos: Array<{ file: File; preview: string }> = [];

  private toastController = inject(ToastController);
  private langService = inject(LanguageService);

  // 翻译对象
  t = this.langService.getTranslations('zh').shared.editEventModal;

  constructor(private fb: FormBuilder) {
    // 监听语言变化
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).shared.editEventModal;
    });
    addIcons({ closeCircle, imageOutline, addCircleOutline });
    this.editForm = this.fb.group({
      EventTitle: ['', Validators.required],
      EventType: [0, Validators.required],
      EventCategory: ['', Validators.required],
      Location: ['', Validators.required],
      LocationPlaceId: [''],
      LocationLng: [null],
      LocationLat: [null],
      Price: [0, [Validators.min(0)]],
      EventDetails: ['', Validators.required],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventData'] && this.eventData) {
      this.resetPhotos();
      this.existingPhotos = this.normalizePhotos(this.eventData.Photos);
      this.editForm.reset({
        EventTitle: this.eventData.EventTitle || '',
        EventType: this.eventData.EventType ?? 0,
        EventCategory: this.eventData.EventCategory || '',
        Location: this.eventData.Location || '',
        LocationPlaceId: this.eventData.LocationPlaceId || '',
        LocationLng: this.eventData.LocationLng ?? null,
        LocationLat: this.eventData.LocationLat ?? null,
        Price: this.eventData.Price ?? 0,
        EventDetails: this.eventData.EventDetails || '',
      });
    }
  }

  private normalizePhotos(
    photos: string | string[] | null | undefined,
  ): string[] {
    if (!photos) return [];
    if (typeof photos === 'string') {
      try {
        const parsed = JSON.parse(photos);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return photos ? [photos] : [];
      }
    }
    return Array.isArray(photos) ? photos : [];
  }

  getAssetUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return this.API_BASE + path;
  }

  getPhotoItems(): Array<{
    preview: string;
    isExisting: boolean;
    index: number;
  }> {
    const existing = this.existingPhotos.map((p, i) => ({
      preview: this.getAssetUrl(p),
      isExisting: true,
      index: i,
    }));
    const next = this.newPhotos.map((p, i) => ({
      preview: p.preview,
      isExisting: false,
      index: i,
    }));
    return [...existing, ...next];
  }

  getPhotoCount(): number {
    return this.existingPhotos.length + this.newPhotos.length;
  }

  triggerFileInput(): void {
    if (this.getPhotoCount() >= this.EDIT_MAX) return;
    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const remaining = this.EDIT_MAX - this.getPhotoCount();
    const oversized: string[] = [];
    const valid: File[] = [];

    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > this.MAX_FILE_SIZE) {
        oversized.push(f.name);
      } else if (valid.length < remaining) {
        valid.push(f);
      }
    }

    if (oversized.length > 0) {
      await this.showToast(`${this.t.fileTooLarge}${oversized.join('、')}`);
    }

    for (const f of valid) {
      this.newPhotos.push({ file: f, preview: URL.createObjectURL(f) });
    }
    input.value = '';
  }

  removePhoto(type: 'existing' | 'new', index: number): void {
    if (type === 'existing') {
      this.existingPhotos.splice(index, 1);
    } else {
      const removed = this.newPhotos[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      this.newPhotos.splice(index, 1);
    }
  }

  private resetPhotos(): void {
    for (const p of this.newPhotos) {
      if (p.preview) URL.revokeObjectURL(p.preview);
    }
    this.newPhotos = [];
    this.existingPhotos = [];
  }

  close(): void {
    this.resetPhotos();
    this.didDismiss.emit();
  }

  async submit(): Promise<void> {
    if (this.editForm.invalid) return;

    const uploaded = await this.uploadPhotos();
    if (uploaded === null) return;

    const allPhotos = [...this.existingPhotos, ...uploaded];
    const photosJson = allPhotos.length > 0 ? JSON.stringify(allPhotos) : null;

    this.save.emit({
      formData: this.editForm.getRawValue(),
      photosJson,
    });
  }

  private async uploadPhotos(): Promise<string[] | null> {
    if (this.newPhotos.length === 0) return [];

    const fd = new FormData();
    for (const p of this.newPhotos) {
      fd.append('images', p.file);
    }

    try {
      const resp = await fetch(`${this.API_BASE}/upload/images`, {
        method: 'POST',
        body: fd,
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success || !Array.isArray(data.paths)) {
        await this.showToast(data?.error || this.t.uploadFailed);
        return null;
      }
      return data.paths;
    } catch {
      await this.showToast(this.t.networkError);
      return null;
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
    });
    await toast.present();
  }

  onLocationPickerClick(): void {
    this.openLocationPicker.emit('eventEdit');
  }

  patchForm(values: Record<string, any>): void {
    this.editForm.patchValue(values);
  }

  getFormValue(key: string): any {
    return this.editForm.get(key)?.value;
  }
}
