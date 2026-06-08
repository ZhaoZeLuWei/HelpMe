import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import {
  EditEventPayload,
  EventEditData,
} from '../../components/edit-event-modal/edit-event-modal.component';
import { Tab4ApiResult, Tab4UserTask } from './tab4.types';

export interface Tab4EventEditSource {
  id: number;
  EventTitle?: string;
  title?: string;
  EventType?: number;
  EventCategory?: string;
  Location?: string;
  LocationPlaceId?: string;
  LocationLng?: number | null;
  LocationLat?: number | null;
  Price?: number;
  EventDetails?: string;
  Photos?: any;
  photos?: any;
}

@Injectable({ providedIn: 'root' })
export class Tab4EventService {
  private readonly apiBase = environment.apiBase;
  private readonly auth = inject(AuthService);

  async fetchUserEventsRaw(userId: number): Promise<any[]> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/events`);
      if (!resp.ok) {
        return [];
      }
      const data = await resp.json().catch(() => null);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Tab4EventService.fetchUserEventsRaw failed', e);
      return [];
    }
  }

  async loadUserEvents(
    userId: number,
    publisherName: string,
  ): Promise<Tab4UserTask[]> {
    const rows = await this.fetchUserEventsRaw(userId);
    return rows.map((e: any) => this.mapEventRow(e, publisherName));
  }

  async deleteEvent(eventId: number): Promise<Tab4ApiResult> {
    try {
      const resp = await fetch(`${this.apiBase}/events/${eventId}`, {
        method: 'DELETE',
        headers: { ...this.auth.getAuthHeader() },
      });
      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        return {
          success: false,
          error: data?.error || data?.msg,
          unauthorized: resp.status === 401,
        };
      }

      if (!data?.success) {
        return { success: false, error: data?.error };
      }

      return { success: true };
    } catch (e) {
      console.error('Tab4EventService.deleteEvent error', e);
      return { success: false };
    }
  }

  async fetchEventForEdit(eventId: number): Promise<{
    event: Tab4EventEditSource | null;
    canEdit: boolean;
    unauthorized?: boolean;
    error?: string;
  }> {
    try {
      const resp = await fetch(`${this.apiBase}/events/${eventId}`);
      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        return {
          event: null,
          canEdit: false,
          unauthorized: resp.status === 401,
          error: data?.error,
        };
      }

      if (!data?.success || !data?.event) {
        return { event: null, canEdit: false };
      }

      return {
        event: { id: eventId, ...data.event },
        canEdit: !!data.event.canCreateOrder,
      };
    } catch (e) {
      console.warn('Tab4EventService.fetchEventForEdit failed', e);
      return { event: null, canEdit: true };
    }
  }

  async updateEvent(
    eventId: number,
    payload: EditEventPayload,
  ): Promise<Tab4ApiResult & { formData?: Record<string, unknown> }> {
    const { formData, photosJson } = payload;

    try {
      const resp = await fetch(`${this.apiBase}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.auth.getAuthHeader(),
        },
        body: JSON.stringify({ ...formData, Photos: photosJson }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        return {
          success: false,
          error: data?.error || data?.msg,
          unauthorized: resp.status === 401,
        };
      }

      return { success: true, formData };
    } catch (e) {
      console.error('Tab4EventService.updateEvent error', e);
      return { success: false };
    }
  }

  async setEventStatus(
    eventId: number,
    status: number,
  ): Promise<Tab4ApiResult & { status?: number; message?: string }> {
    try {
      const resp = await fetch(`${this.apiBase}/events/${eventId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.auth.getAuthHeader(),
        },
        body: JSON.stringify({ Status: status }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        return {
          success: false,
          error: data?.error,
          unauthorized: resp.status === 401,
        };
      }

      return {
        success: true,
        status: data.status,
        message: data.message,
      };
    } catch (e) {
      console.error('Tab4EventService.setEventStatus error', e);
      return { success: false };
    }
  }

  buildEditData(taskId: number, source: Tab4EventEditSource): EventEditData {
    return {
      id: taskId,
      EventTitle: source.EventTitle || source.title || '',
      EventType: source.EventType ?? 0,
      EventCategory: source.EventCategory || '',
      Location: source.Location || '',
      LocationPlaceId: source.LocationPlaceId || '',
      LocationLng:
        source.LocationLng != null ? Number(source.LocationLng) : null,
      LocationLat:
        source.LocationLat != null ? Number(source.LocationLat) : null,
      Price: source.Price ?? 0,
      EventDetails: source.EventDetails || '',
      Photos: source.Photos || source.photos || null,
    };
  }

  mergeTaskAfterEdit(
    task: Tab4UserTask,
    formData: Record<string, unknown>,
    photosJson: string | null,
  ): Tab4UserTask {
    return {
      ...task,
      ...formData,
      title: String(formData['EventTitle'] ?? task.title),
      Photos: photosJson,
      photos: photosJson,
    } as Tab4UserTask;
  }

  private mapEventRow(e: any, publisherName: string): Tab4UserTask {
    return {
      id: Number(e.EventId),
      publisher: publisherName || '',
      title: e.EventTitle,
      status: 'published',
      statusKey: 'published',
      createdAt: e.CreateTime || '',
      EventTitle: e.EventTitle,
      EventType: e.EventType ?? 0,
      EventCategory: e.EventCategory || '',
      Location: e.Location || '',
      location: e.Location || '',
      LocationPlaceId: e.LocationPlaceId || '',
      locationPlaceId: e.LocationPlaceId || '',
      LocationLng: e.LocationLng != null ? Number(e.LocationLng) : null,
      locationLng: e.LocationLng != null ? Number(e.LocationLng) : null,
      LocationLat: e.LocationLat != null ? Number(e.LocationLat) : null,
      locationLat: e.LocationLat != null ? Number(e.LocationLat) : null,
      Price: e.Price ?? 0,
      EventDetails: e.EventDetails || '',
      Photos: e.Photos || null,
      photos: e.Photos || null,
      Status: Number(e.Status ?? 0),
    };
  }
}
