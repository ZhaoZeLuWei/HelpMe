export type Tab4OrderFilter =
  | 'all'
  | 'pending'
  | 'active'
  | 'review'
  | 'done'
  | 'cancelled';

export interface Tab4OrderStats {
  all: number;
  pending: number;
  active: number;
  review: number;
  done: number;
  cancelled: number;
}

export interface Tab4Order {
  id: number;
  eventId: number;
  consumerId: number;
  providerId: number;
  title: string;
  location: string;
  price: number;
  creatorName: string;
  consumerName: string;
  createdAt: string;
  confirmedAt: string;
  completedAt: string;
  cancelledAt: string;
  status: string;
  statusKey: string;
  statusColor: string;
  role: 'buyer' | 'seller';
  reviewCount: number;
  hasReviewed: boolean;
  otherHasReviewed: boolean;
  snapshot: any;
  snapshotTitle: string;
  snapshotPrice: number;
  snapshotLocation: string;
  snapshotDetails: string;
  snapshotCategory: string;
  snapshotPhotos: string[];
  deliveryAddress: string;
  deliverySpecific: string;
  deliveryAdditionalInfo: string;
  cancelledByName: string;
}

export interface Tab4UserTask {
  id: number;
  publisher: string;
  title: string;
  status: string;
  statusKey: string;
  createdAt: string;
  EventTitle: string;
  EventType: number;
  EventCategory: string;
  Location: string;
  location: string;
  LocationPlaceId: string;
  locationPlaceId: string;
  LocationLng: number | null;
  locationLng: number | null;
  LocationLat: number | null;
  locationLat: number | null;
  Price: number;
  EventDetails: string;
  Photos: any;
  photos: any;
  Status: number;
}

export interface Tab4ApiResult {
  success: boolean;
  error?: string;
  unauthorized?: boolean;
}
