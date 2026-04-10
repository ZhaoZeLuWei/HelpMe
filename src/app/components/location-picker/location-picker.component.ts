import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmark } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

export interface PickedLocation {
  placeId: string;
  text: string;
  address: string;
  lng: number;
  lat: number;
}

interface LocationOption {
  id: string;
  name: string;
  shortName?: string;
  district?: string;
  address?: string;
  lng: number;
  lat: number;
  tags?: string[];
  distanceMeters?: number | null;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.scss'],
  imports: [CommonModule, FormsModule, IonicModule],
})
export class LocationPickerComponent implements OnInit {
  @Input() selectedPlaceId?: string;
  @Input() selectedText?: string;
  @Input() centerLng = 109.41318;
  @Input() centerLat = 24.31834;

  private readonly apiBase = environment.apiBase;
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  keyword = '';
  loading = signal(false);
  locations = signal<LocationOption[]>([]);

  constructor() {
    addIcons({ checkmark });
  }

  ngOnInit(): void {
    this.loadSuggestions();
  }

  async close() {
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async selectLocation(item: LocationOption) {
    const text = item.name || item.shortName || this.selectedText || '';
    const payload: PickedLocation = {
      placeId: item.id,
      text,
      address: item.address || text,
      lng: Number(item.lng),
      lat: Number(item.lat),
    };

    await this.modalCtrl.dismiss({ selected: payload }, 'confirm');
  }

  onKeywordChange(value: string | null | undefined) {
    this.keyword = String(value || '').trim();
    this.loadSuggestions();
  }

  private async loadSuggestions() {
    this.loading.set(true);

    const params = new URLSearchParams();
    if (this.keyword) params.append('q', this.keyword);
    params.append('lng', String(this.centerLng));
    params.append('lat', String(this.centerLat));
    params.append('limit', '20');

    try {
      const resp = await fetch(
        `${this.apiBase}/locations/suggest?${params.toString()}`,
      );
      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        throw new Error(data?.error || '加载地点失败');
      }

      this.locations.set(Array.isArray(data.locations) ? data.locations : []);
    } catch (err: any) {
      this.locations.set([]);
      const t = await this.toastCtrl.create({
        message: err?.message || '无法获取地点列表',
        duration: 1600,
        position: 'bottom',
      });
      await t.present();
    } finally {
      this.loading.set(false);
    }
  }
}
