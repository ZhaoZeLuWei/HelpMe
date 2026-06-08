import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {
  LocationPickerComponent,
  type PickedLocation,
} from '../components/location-picker/location-picker.component';

export type OpenLocationPickerOptions = {
  selectedPlaceId?: string;
  selectedText?: string;
  cssClass?: string;
};

@Injectable({ providedIn: 'root' })
export class LocationPickerService {
  private readonly modalController = inject(ModalController);

  async pickLocation(
    options: OpenLocationPickerOptions = {},
  ): Promise<PickedLocation | null> {
    const modal = await this.modalController.create({
      component: LocationPickerComponent,
      cssClass: options.cssClass ?? 'location-picker-modal',
      componentProps: {
        selectedPlaceId: options.selectedPlaceId ?? '',
        selectedText: options.selectedText ?? '',
      },
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role !== 'confirm' || !data?.selected) {
      return null;
    }
    return data.selected as PickedLocation;
  }
}
