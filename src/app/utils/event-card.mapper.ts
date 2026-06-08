import { EventCardData } from '../components/show-event/show-event.component';

/** 解析 Photos 字段为首图 URL */
export function parseFirstPhotoUrl(photos: unknown): string {
  if (photos == null || photos === '') {
    return '';
  }
  if (Array.isArray(photos)) {
    return photos[0] ? String(photos[0]) : '';
  }
  if (typeof photos === 'string') {
    const trimmed = photos.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed[0] ? String(parsed[0]) : '';
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }
  return String(photos);
}

/** /api/cards 或 favorites 条目 → show-event 卡片数据 */
export function mapApiCardToEventCardData(item: any): EventCardData {
  return {
    id: String(item.id ?? item.EventId),
    creatorId: Number(item.creatorId ?? item.CreatorId) || 0,
    cardImage: item.cardImage ?? parseFirstPhotoUrl(item.Photos) ?? '',
    distance: item.distance ?? '',
    name: item.name ?? item.UserName ?? '',
    address: item.address ?? item.Location ?? '',
    demand: item.demand ?? item.EventDetails ?? '',
    price: item.price != null ? String(item.price) : String(item.Price ?? '0'),
    avatar: item.avatar ?? item.UserAvatar ?? '',
    createTime: item.createTime ?? item.CreateTime ?? '',
    title: item.title ?? item.EventTitle ?? '',
    tags: item.tags ?? '',
    eventType:
      item.eventType != null
        ? Number(item.eventType)
        : item.EventType != null
          ? Number(item.EventType)
          : null,
    lng:
      item.lng != null
        ? Number(item.lng)
        : item.LocationLng != null
          ? Number(item.LocationLng)
          : null,
    lat:
      item.lat != null
        ? Number(item.lat)
        : item.LocationLat != null
          ? Number(item.LocationLat)
          : null,
  };
}

/** 收藏接口原始条目 → 卡片列表（含空 distance） */
export function mapFavoritesToEventCards(favorites: any[]): EventCardData[] {
  return favorites.map((f) => ({
    ...mapApiCardToEventCardData(f),
    distance: '',
  }));
}
