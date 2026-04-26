import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmark, locate, map, close, save } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

declare const AMap: any;

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

interface AddressDetail {
  province: string;
  city: string;
  district: string;
  township: string;
  street: string;
  formattedAddress: string;
  poiName?: string;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.scss'],
  imports: [CommonModule, FormsModule, IonicModule],
})
export class LocationPickerComponent implements OnInit, AfterViewInit, OnDestroy {
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
  selectedMapLocation = signal<{ lng: number; lat: number } | null>(null);
  currentAddress = signal<string>('');
  isLocating = signal(false);
  
  nearbyLocations = signal<LocationOption[]>([]);
  addressDetail = signal<AddressDetail | null>(null);

  private map: any = null;
  private geocoder: any = null;
  private geocodeDebounceTimer: number | null = null;
  private searchDebounceTimer: number | null = null; // 👈 加上这行
  private isSatelliteMode = false;
  private readonly CACHE_KEY = 'cachedLocations';

  constructor() {
    addIcons({ checkmark, locate, map, close, save });
  }

  ngOnInit(): void {
    this.clearExpiredCache();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.geocodeDebounceTimer) clearTimeout(this.geocodeDebounceTimer);
    if (this.map) this.map.destroy();
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
    this.saveToCache(payload);
  }

  onKeywordChange(value: string | null | undefined) {
    this.keyword = String(value || '').trim();
    
    if (!this.keyword) {
      this.locations.set([]);
      return;
    }

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = window.setTimeout(() => {
      this.searchLocations(this.keyword);
    }, 300);
  }

  // ================= 混合模式搜索：本地缓存 + 高德 API =================

  private searchLocations(keyword: string) {
    this.loading.set(true);
    // 只要用户在搜索，就完全交给高德在当前城市里找，不拿本地缓存糊弄人
    this.searchByAMap(keyword);
  }

  private searchFromCache(keyword: string): LocationOption[] | null {
    try {
      const data = localStorage.getItem(this.CACHE_KEY);
      if (!data) return null;

      const cached: any[] = JSON.parse(data);
      const lowerKeyword = keyword.toLowerCase();

      const matched = cached.filter(item => {
        const name = (item.text || '').toLowerCase();
        const address = (item.address || '').toLowerCase();
        return name.includes(lowerKeyword) || address.includes(lowerKeyword);
      });

      if (matched.length > 0) {
        return matched
          .sort((a: any, b: any) => (b.useCount || 0) - (a.useCount || 0))
          .slice(0, 10)
          .map((item: any) => ({
            id: item.placeId,
            name: item.text,
            address: item.address,
            district: '',
            lng: item.lng,
            lat: item.lat,
            distanceMeters: null,
          }));
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  private searchByAMap(keyword: string) {
    this.loading.set(true);

    const doSearch = () => {
      // 1. 获取当前城市（优先用解析出来的，没有就用默认的）
      const detail = this.addressDetail();
      const currentCity = detail?.city || detail?.province || '全国';

      const placeSearch = new AMap.PlaceSearch({
        pageSize: 20,
        pageIndex: 1,
        city: currentCity,      // 👈 核心修改：限定在当前城市搜索
        citylimit: true,        // 👈 核心修改：严格限制不跨城市（不会搜出北京的万达了）
        extensions: 'all',
      });

      // 2. 使用全局搜索（但已经被 city 限制了范围）
      placeSearch.search(keyword, (status: string, result: any) => {
        console.log('【高德搜索状态】:', status);
        console.log('【高德搜索结果】:', result);
        this.loading.set(false);
        
        if (status === 'complete' && result.poiList?.pois) {
          const list = result.poiList.pois.map((poi: any) => ({
            id: poi.id || `amap_${Date.now()}`,
            name: poi.name || '未知地点',
            address: poi.address || poi.name || '',
            lng: poi.location?.lng || 0,
            lat: poi.location?.lat || 0,
            district: (poi.pname || '') + (poi.cityname || '') + (poi.adname || ''),
            distanceMeters: poi.distance ? Math.round(poi.distance) : null,
          }));
          
          this.locations.set(list);
          this.cacheAMapResults(list);
        } else {
          this.locations.set([]); 
        }
      });
    };

    if (typeof AMap !== 'undefined' && AMap.PlaceSearch) {
      doSearch();
    } else {
      AMap.plugin(['AMap.PlaceSearch'], doSearch);
    }
  }

  private cacheAMapResults(list: LocationOption[]) {
    try {
      const cachedLocations = this.getCachedLocations();
      
      list.forEach(poi => {
        if (!poi.address || poi.address === poi.name) return;

        const existingIndex = cachedLocations.findIndex(
          (item: any) => item.placeId === poi.id
        );

        if (existingIndex > -1) {
          cachedLocations[existingIndex].timestamp = Date.now();
        } else {
          cachedLocations.push({
            placeId: poi.id,
            text: poi.name,
            address: poi.address,
            lng: poi.lng,
            lat: poi.lat,
            useCount: 0,
            timestamp: Date.now(),
          });
        }
      });

      const sorted = cachedLocations
        .sort((a: any, b: any) => (b.useCount || 0) - (a.useCount || 0))
        .slice(0, 50);

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(sorted));
    } catch (e) {
      console.error('缓存高德结果失败:', e);
    }
  }

  // ================= 地图初始化 =================

  private initMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer || typeof AMap === 'undefined') {
      this.showToast('地图加载失败');
      return;
    }

    // 1. 先无脑把地图画出来（不依赖任何插件）
    this.map = new AMap.Map(mapContainer, {
      center: [this.centerLng, this.centerLat],
      zoom: 18,
      resizeEnable: true,
      rotateEnable: false,
    });

    // 地图点击选点
    this.map.on('click', (e: any) => {
      const lng = e.lnglat.getLng();
      const lat = e.lnglat.getLat();
      this.selectedMapLocation.set({ lng, lat });
      this.debounceReverseGeocode(lng, lat);
      this.addMapMarker(lng, lat);
    });

    // 地图移动结束
    this.map.on('moveend', () => {
      const center = this.map.getCenter();
      this.debounceReverseGeocode(center.getLng(), center.getLat());
    });

    // 2. 然后再偷偷去加载插件（失败了也不影响地图展示）
    AMap.plugin(['AMap.Geocoder', 'AMap.PlaceSearch'], () => {
      this.geocoder = new AMap.Geocoder({
        city: '全国',
        radius: 1000,
      });
      
      // 👇 关键：插件加载完后，立刻主动去查一次当前坐标的周边和地址
      this.reverseGeocode(this.centerLng, this.centerLat);
    });

    setTimeout(() => {
      if (this.map) {
        this.map.resize();
      }
    }, 100);
  }

  private addMapMarker(lng: number, lat: number) {
    if (!this.map) return;
    this.map.clearMap();
    new AMap.Marker({
      position: [lng, lat],
      map: this.map,
    });
  }

  // ================= 定位与卫星图切换 =================

  async getCurrentLocation() {
    if (!navigator.geolocation) {
      this.showToast('您的浏览器不支持定位功能');
      return;
    }

    this.isLocating.set(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const lng = position.coords.longitude;
      const lat = position.coords.latitude;

      this.selectedMapLocation.set({ lng, lat });
      
      if (this.map) {
        this.map.setCenter([lng, lat]);
        this.map.setZoom(16);
        this.addMapMarker(lng, lat);
      }

      await this.reverseGeocode(lng, lat);
    } catch (err: any) {
      let msg = '定位失败，请手动选择';
      if (err.code === 1) msg = '您拒绝了定位权限，请手动选择';
      if (err.code === 2) msg = '无法获取位置信息，请检查网络';
      this.showToast(msg);
    } finally {
      this.isLocating.set(false);
    }
  }

  toggleSatellite() {
    if (!this.map) return;

    this.isSatelliteMode = !this.isSatelliteMode;
    
    if (this.isSatelliteMode) {
      this.map.setLayers([
        new AMap.TileLayer.Satellite(),
        new AMap.TileLayer.RoadNet()
      ]);
    } else {
      this.map.setLayers([new AMap.TileLayer()]);
    }
  }

  // ================= 地址解析 =================

  private debounceReverseGeocode(lng: number, lat: number) {
    if (this.geocodeDebounceTimer) clearTimeout(this.geocodeDebounceTimer);
    this.geocodeDebounceTimer = window.setTimeout(() => {
      this.reverseGeocode(lng, lat);
    }, 500);
  }

  private async reverseGeocode(lng: number, lat: number) {
    if (!this.geocoder) return;

    return new Promise<void>((resolve) => {
      this.geocoder.getAddress([lng, lat], (status: string, result: any) => {
        if (status === 'complete' && result.info === 'OK') {
          const address = result.regeocode;
          const detail: AddressDetail = {
            province: address.addressComponent.province || '',
            city: address.addressComponent.city || '',
            district: address.addressComponent.district || '',
            township: address.addressComponent.township || '',
            street: address.addressComponent.street || '',
            formattedAddress: address.formattedAddress,
            poiName: address.pois?.[0]?.name,
          };

          this.currentAddress.set(detail.formattedAddress);
          this.addressDetail.set(detail);
          this.loadNearbyLocations(lng, lat);
        }
        resolve();
      });
    });
  }

  // ================= 数据加载 =================

  private async loadNearbyLocations(lng: number, lat: number) {
    const params = new URLSearchParams();
    params.append('lng', String(lng));
    params.append('lat', String(lat));
    params.append('limit', '10');

    try {
      const resp = await fetch(`${this.apiBase}/locations/suggest?${params.toString()}&_t=${Date.now()}`);
      const data = await resp.json().catch(() => null);

      if (resp.ok && data?.success && Array.isArray(data.locations) && data.locations.length > 0) {
        this.nearbyLocations.set(data.locations);
      }
    } catch (err) {}

    this.loadNearbyFromAMap(lng, lat);
  }

  async confirmMapLocation() {
    const location = this.selectedMapLocation();
    const address = this.currentAddress();
    if (!location || !address) return;

    const payload: PickedLocation = {
      placeId: `manual_${Date.now()}`,
      text: address,
      address,
      lng: location.lng,
      lat: location.lat,
    };

    await this.modalCtrl.dismiss({ selected: payload }, 'confirm');
    this.saveToCache(payload);
  }


  // private async loadNearbyLocations(lng: number, lat: number) {
  //   const params = new URLSearchParams();
  //   params.append('lng', String(lng));
  //   params.append('lat', String(lat));
  //   params.append('limit', '10');

  //   try {
  //     const resp = await fetch(`${this.apiBase}/locations/suggest?${params.toString()}&_t=${Date.now()}`);
  //     const data = await resp.json().catch(() => null);
      
  //     // 如果后端有你们自己的私有数据，直接用
  //     if (resp.ok && data?.success && Array.isArray(data.locations) && data.locations.length > 0) {
  //       this.nearbyLocations.set(data.locations);
  //       return; // 有数据就结束，不打扰高德
  //     }
  //   } catch (err) {
  //     // 后端报错也不管，继续走下面的高德兜底
  //   }

  //   // 👇 核心兜底逻辑：后端没数据，用高德地图搜索周边填充列表
  //   this.loadNearbyFromAMap(lng, lat);
  // }

  // 新增：调用高德地图搜索周边
  private loadNearbyFromAMap(lng: number, lat: number) {
    // 确保高德插件加载完毕
    if (typeof AMap === 'undefined' || !AMap.PlaceSearch) {
      return;
    }

    const placeSearch = new AMap.PlaceSearch({
      pageSize: 10,
      pageIndex: 1,
    });

    const center = new AMap.LngLat(lng, lat);

    // 搜索周边 500 米内的地点
    placeSearch.searchNearBy('', center, 500, (status: string, result: any) => {
      if (status === 'complete' && result.poiList?.pois) {
        const list = result.poiList.pois.map((poi: any) => ({
          id: poi.id || `amap_${Date.now()}`,
          name: poi.name || '未知地点',
          address: poi.address || poi.name || '',
          lng: poi.location?.lng || 0,
          lat: poi.location?.lat || 0,
          distanceMeters: poi.distance ? Math.round(poi.distance) : null,
        }));
        
        this.nearbyLocations.set(list);
         // ✅ 保存到后端数据库
        this.saveNearbyToBackend(list);
      }
    });
  }
  // 新增：保存附近地点到后端数据库
private async saveNearbyToBackend(locations: LocationOption[]) {
  try {
    const resp = await fetch(`${this.apiBase}/locations/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    });
    const data = await resp.json();
    if (data.success) {
      console.log(`成功保存 ${data.count} 个地点到数据库`);
    }
  } catch (err) {
    console.error('保存地点到后端失败:', err);
  }
}
  // ================= 缓存方法 =================

  private saveToCache(location: PickedLocation): void {
    try {
      const cachedLocations = this.getCachedLocations();
      const existingIndex = cachedLocations.findIndex(
        (item: any) => item.placeId === location.placeId
      );

      if (existingIndex > -1) {
        cachedLocations[existingIndex].useCount = (cachedLocations[existingIndex].useCount || 0) + 1;
        cachedLocations[existingIndex].timestamp = Date.now();
      } else {
        cachedLocations.push({
          ...location,
          useCount: 1,
          timestamp: Date.now(),
        });
      }

      const sorted = cachedLocations
        .sort((a: any, b: any) => b.useCount - a.useCount)
        .slice(0, 20);

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(sorted));
    } catch (err) {
      console.error('缓存地址失败:', err);
    }
  }

  private getCachedLocations(): any[] {
    try {
      const data = localStorage.getItem(this.CACHE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      return [];
    }
  }

  private clearExpiredCache(): void {
    try {
      const locations = this.getCachedLocations();
      const now = Date.now();
      const validLocations = locations.filter((item: any) => {
        const hoursDiff = (now - item.timestamp) / (1000 * 60 * 60);
        const expireHours = item.useCount > 3 ? 24 * 30 : 24 * 7;
        return hoursDiff < expireHours;
      });

      if (validLocations.length < locations.length) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(validLocations));
      }
    } catch (err) {
      console.error('清理过期缓存失败:', err);
    }
  }

  // ================= 工具方法 =================
  
  private async showToast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    await t.present();
  }
}