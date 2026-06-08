import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';

export interface Tab4UserInfo {
  name: string;
  isVerified: string;
  creditLevel: string;
  goodReviewRate: string;
  buyerRanking: number;
  providerRole: number;
  orderCount: number;
  serviceRanking: number;
  followerCount?: number;
  location: string;
  locationPlaceId: string;
  locationLng: number | null;
  locationLat: number | null;
  avatar: string;
  introduction: string;
  realName: string;
  idCardNumber: string;
  birthDate: string;
  stats: { favorites: number; views: number; follows: number };
}

export interface Tab4VerificationLabels {
  verified: string;
  rejected: string;
  pending: string;
  notVerified: string;
}

@Injectable({ providedIn: 'root' })
export class Tab4UserService {
  private readonly apiBase = environment.apiBase;
  private readonly auth = inject(AuthService);

  createDefaultUserInfo(notVerifiedLabel: string): Tab4UserInfo {
    return {
      name: '',
      isVerified: notVerifiedLabel,
      creditLevel: '',
      goodReviewRate: '',
      buyerRanking: 0,
      providerRole: 0,
      orderCount: 0,
      serviceRanking: 0,
      location: '',
      locationPlaceId: '',
      locationLng: null,
      locationLat: null,
      avatar: '',
      introduction: '',
      realName: '',
      idCardNumber: '',
      birthDate: '',
      stats: { favorites: 0, views: 0, follows: 0 },
    };
  }

  applyUserData(
    userInfo: Tab4UserInfo,
    data: any,
    labels: Tab4VerificationLabels,
  ): void {
    userInfo.name = data.UserName || data.userName || '';
    userInfo.location = data.Location || data.location || '';
    userInfo.locationPlaceId =
      data.LocationPlaceId || data.locationPlaceId || '';
    userInfo.locationLng =
      data.LocationLng != null ? Number(data.LocationLng) : null;
    userInfo.locationLat =
      data.LocationLat != null ? Number(data.LocationLat) : null;
    userInfo.introduction = data.Introduction || data.introduction || '';
    userInfo.avatar = data.UserAvatar || data.userAvatar || '';
    userInfo.buyerRanking = Number(data.BuyerRanking || data.buyerRanking) || 0;
    userInfo.providerRole = Number(data.ProviderRole || data.providerRole) || 0;
    userInfo.orderCount = Number(data.OrderCount || data.orderCount) || 0;
    userInfo.followerCount =
      Number(data.FollowerCount || data.followerCount) || 0;
    userInfo.serviceRanking =
      Number(data.ServiceRanking || data.serviceRanking) || 0;
    userInfo.realName = data.RealName || data.realName || '';
    userInfo.idCardNumber = data.IdCardNumber || data.idCardNumber || '';
    userInfo.birthDate = data.BirthDate || data.birthDate || '';

    const vs = data.VerificationStatus ?? data.verificationStatus;
    if (vs === 1) userInfo.isVerified = labels.verified;
    else if (vs === 2) userInfo.isVerified = labels.rejected;
    else if (vs === 0) userInfo.isVerified = labels.pending;
    else userInfo.isVerified = labels.notVerified;
  }

  parseStoredUser(): { user: any | null; userId: number | null } {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return { user: null, userId: null };
      const user = JSON.parse(raw);
      const userId = user.UserId || user.userId || user.id;
      return {
        user,
        userId: userId != null ? Number(userId) : null,
      };
    } catch {
      return { user: null, userId: null };
    }
  }

  async fetchProfile(userId: number): Promise<{
    user: any | null;
    unauthorized?: boolean;
  }> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/profile`);
      if (!resp.ok) {
        return { user: null, unauthorized: resp.status === 401 };
      }
      const data = await resp.json().catch(() => null);
      if (data?.success && data.user) {
        return { user: data.user };
      }
      return { user: null };
    } catch (e) {
      console.warn('Tab4UserService.fetchProfile failed', e);
      return { user: null };
    }
  }

  async fetchUserComments(userId: number): Promise<any[]> {
    try {
      const resp = await fetch(`${this.apiBase}/users/${userId}/comments`);
      if (!resp.ok) {
        return [];
      }
      const data = await resp.json().catch(() => null);
      if (data?.success && Array.isArray(data.comments)) {
        return data.comments;
      }
      return [];
    } catch (e) {
      console.warn('Tab4UserService.fetchUserComments failed', e);
      return [];
    }
  }

  async fetchFavoritesRaw(): Promise<any[]> {
    try {
      const resp = await fetch(`${this.apiBase}/favorites`, {
        headers: this.auth.getAuthHeader(),
      });
      const data = await resp.json().catch(() => null);
      if (data?.success && Array.isArray(data.favorites)) {
        return data.favorites;
      }
      return [];
    } catch (e) {
      console.warn('Tab4UserService.fetchFavoritesRaw failed', e);
      return [];
    }
  }

  async loadSocialCounts(): Promise<{
    favoritesCount: number;
    followsCount: number;
    favorites: any[];
  }> {
    try {
      const [favorites, followResp] = await Promise.all([
        this.fetchFavoritesRaw(),
        fetch(`${this.apiBase}/follows`, {
          headers: this.auth.getAuthHeader(),
        }),
      ]);
      const followData = await followResp.json().catch(() => null);

      return {
        favorites,
        favoritesCount: favorites.length,
        followsCount:
          followData?.success && Array.isArray(followData.follows)
            ? followData.follows.length
            : 0,
      };
    } catch (e) {
      console.error('Tab4UserService.loadSocialCounts error', e);
      return { favoritesCount: 0, followsCount: 0, favorites: [] };
    }
  }
}
