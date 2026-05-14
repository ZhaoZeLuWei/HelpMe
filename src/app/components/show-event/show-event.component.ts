import {
  Component,
  Input,
  Output,
  EventEmitter,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../services/language.service';
import { TranslateTextPipe } from '../../pipes/translate-text.pipe';

// ── 距离工具函数（全局缓存） ──

declare const AMap: any;

let _cachedPos: { lng: number; lat: number; timestamp: number } | null = null;
let _posPromise: Promise<{ lng: number; lat: number } | null> | null = null;

function _tryAMapPos(): Promise<{ lng: number; lat: number } | null> {
  return new Promise((resolve) => {
    if (typeof AMap === 'undefined') return resolve(null);
    AMap.plugin(['AMap.Geolocation'], () => {
      const g = new AMap.Geolocation({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      });
      g.getCurrentPosition((status: string, r: any) => {
        if (status === 'complete')
          resolve({ lng: r.position.getLng(), lat: r.position.getLat() });
        else resolve(null);
      });
    });
  });
}

function _initPos(): Promise<{ lng: number; lat: number } | null> {
  if (_posPromise) return _posPromise;
  _posPromise = (async () => {
    const p = await _tryAMapPos();
    if (p) {
      _cachedPos = { ...p, timestamp: Date.now() };
      return p;
    }
    if (!navigator.geolocation) return null;
    return new Promise((r) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const res = { lng: pos.coords.longitude, lat: pos.coords.latitude };
          _cachedPos = { ...res, timestamp: Date.now() };
          r(res);
        },
        () => r(null),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    });
  })();
  return _posPromise;
}

/** 获取用户位置 */
export async function getUserPosition(): Promise<{
  lng: number;
  lat: number;
} | null> {
  if (_cachedPos && Date.now() - _cachedPos.timestamp < 30 * 60 * 1000)
    return { lng: _cachedPos.lng, lat: _cachedPos.lat };
  if (_posPromise) return _posPromise;
  return _initPos();
}

/** 是否为"线上服务" */
export function isOnlineService(address: string): boolean {
  return (
    address?.includes('线上服务') ||
    address?.includes('在线服务') ||
    address?.includes('线上') ||
    address?.includes('Online') ||
    address?.includes('online') ||
    address?.includes('Remote')
  );
}

const CITY = {
  柳州: { lng: 109.41318, lat: 24.31834 },
  深圳: { lng: 114.0579, lat: 22.5431 },
  成都: { lng: 104.0665, lat: 30.5728 },
  上海: { lng: 121.4737, lat: 31.2304 },
  北京: { lng: 116.4074, lat: 39.9042 },
  广州: { lng: 113.2644, lat: 23.1291 },
  杭州: { lng: 120.1551, lat: 30.2741 },
  武汉: { lng: 114.3054, lat: 30.5931 },
  南京: { lng: 118.7969, lat: 32.0603 },
  重庆: { lng: 106.5516, lat: 29.563 },
  西安: { lng: 108.9402, lat: 34.2611 },
  长沙: { lng: 112.9388, lat: 28.2282 },
  苏州: { lng: 120.5841, lat: 31.299 },
  天津: { lng: 117.201, lat: 39.0842 },
  郑州: { lng: 113.6254, lat: 34.7466 },
  东莞: { lng: 113.7518, lat: 23.0207 },
  青岛: { lng: 120.3826, lat: 36.0671 },
};

let _addrCache = new Map<string, { lng: number; lat: number }>();
let _geocoder: any = null;
let _geoPromise: Promise<void> | null = null;

async function _ensureGeo() {
  if (_geocoder || _geoPromise) return _geoPromise;
  _geoPromise = new Promise((r) => {
    if (typeof AMap === 'undefined') return r();
    AMap.plugin(['AMap.Geocoder'], () => {
      _geocoder = new AMap.Geocoder({ city: '全国', radius: 1000 });
      r();
    });
  });
  return _geoPromise;
}

/** 地址转坐标 */
export async function resolveAddress(
  addr: string,
): Promise<{ lng: number; lat: number } | null> {
  if (!addr || isOnlineService(addr)) return null;
  const c = _addrCache.get(addr);
  if (c) return c;
  const m = addr.match(/^([^\s·]+)[·\s]/);
  if (m && CITY[m[1] as keyof typeof CITY]) {
    _addrCache.set(addr, CITY[m[1] as keyof typeof CITY]);
    return CITY[m[1] as keyof typeof CITY];
  }
  await _ensureGeo();
  if (!_geocoder) return null;
  return new Promise((r) => {
    _geocoder.getLocation(addr, (s: string, res: any) => {
      if (s === 'complete' && res.geocodes?.length) {
        const loc = res.geocodes[0];
        const coords = {
          lng: loc.location.getLng(),
          lat: loc.location.getLat(),
        };
        _addrCache.set(addr, coords);
        r(coords);
      } else r(null);
    });
  });
}

/** Haversine 距离（米） */
export function calculateDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): number {
  const R = 6378137;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 格式化距离 */
export function formatDistance(meters: number, lang: string = 'zh'): string {
  if (meters < 0) return '';
  const km = meters / 1000;
  const d = km < 10 ? 2 : km < 100 ? 1 : 0;
  const prefix = lang === 'en' ? '' : '距';
  return `${prefix}${km.toFixed(d)}km`;
}

// 定义小卡片的数据接口
export interface EventCardData {
  id: string;
  cardImage: string;
  distance: string;
  name: string;
  address: string;
  demand: string;
  price: string;
  avatar: string;
  createTime: string;
  creatorId: number;
  title: string;
  lng?: number | null;
  lat?: number | null;
  tags?: string;
  eventType?: number | null;
}

@Component({
  selector: 'app-show-event',
  templateUrl: './show-event.component.html',
  styleUrls: ['./show-event.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, TranslateTextPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ShowEventComponent {
  @Input() event!: EventCardData;
  @Output() cardClick = new EventEmitter<EventCardData>();

  private readonly API_BASE = environment.apiBase;
  private readonly PLACEHOLDER_IMG =
    'https://picsum.photos/seed/default/600/400';
  private readonly PLACEHOLDER_ICON = 'assets/icon/user.svg';

  // 翻译对象 - 声明但不初始化
  t: any;

  constructor(private langService: LanguageService) {
    // 在构造函数中初始化翻译对象
    this.t = this.langService.getTranslations('zh').shared.eventCard;

    // 监听语言变化
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).shared.eventCard;
    });
  }

  imgUrl(p: any): string {
    if (!p) return this.PLACEHOLDER_IMG;
    const s = String(p).trim();
    if (!s) return this.PLACEHOLDER_IMG;
    if (s.startsWith('/')) return this.API_BASE + s;
    return this.PLACEHOLDER_IMG;
  }

  onImageError(event: any) {
    if (event.target.src !== this.PLACEHOLDER_IMG) {
      event.target.src = this.PLACEHOLDER_IMG;
    }
  }

  avatarUrl(p?: string): string {
    if (!p) return this.PLACEHOLDER_ICON;
    const s = String(p).trim();
    if (!s) return this.PLACEHOLDER_ICON;
    if (s.startsWith('/')) return this.API_BASE + s;
    return this.PLACEHOLDER_ICON;
  }

  onAvatarError(event: any) {
    if (event.target.src !== this.PLACEHOLDER_ICON) {
      event.target.src = this.PLACEHOLDER_ICON;
    }
  }

  get isOnline(): boolean {
    return isOnlineService(this.event?.address);
  }

  onCardClick() {
    this.cardClick.emit(this.event);
  }
}
