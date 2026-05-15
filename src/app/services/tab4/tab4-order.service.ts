import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import {
  Tab4ApiResult,
  Tab4Order,
  Tab4OrderFilter,
  Tab4OrderStats,
} from './tab4.types';

@Injectable({ providedIn: 'root' })
export class Tab4OrderService {
  private readonly apiBase = environment.apiBase;
  private readonly auth = inject(AuthService);

  async loadOrders(userId: number): Promise<{
    orders: Tab4Order[];
    orderStats: Tab4OrderStats;
    unauthorized?: boolean;
  }> {
    const emptyStats: Tab4OrderStats = {
      all: 0,
      pending: 0,
      active: 0,
      review: 0,
      done: 0,
      cancelled: 0,
    };

    try {
      const resp = await fetch(`${this.apiBase}/orders?role=all`, {
        headers: { ...this.auth.getAuthHeader() },
      });

      if (!resp.ok) {
        return {
          orders: [],
          orderStats: emptyStats,
          unauthorized: resp.status === 401,
        };
      }

      const data = await resp.json().catch(() => null);
      const rows = Array.isArray(data?.orders) ? data.orders : [];
      const mapped = rows
        .filter(
          (o: any) =>
            Number(o.ConsumerId) === userId || Number(o.ProviderId) === userId,
        )
        .map((o: any) => this.mapOrderRow(o, userId));

      return {
        orders: mapped,
        orderStats: this.buildOrderStats(mapped),
      };
    } catch (e) {
      console.error('Tab4OrderService.loadOrders error', e);
      return { orders: [], orderStats: emptyStats };
    }
  }

  async performAction(
    orderId: number,
    action: 'confirm' | 'complete' | 'cancel',
  ): Promise<Tab4ApiResult> {
    try {
      const resp = await fetch(`${this.apiBase}/orders/${orderId}/${action}`, {
        method: 'PUT',
        headers: { ...this.auth.getAuthHeader() },
      });
      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        return {
          success: false,
          error: data?.error,
          unauthorized: resp.status === 401,
        };
      }

      return { success: true };
    } catch (e) {
      console.error('Tab4OrderService.performAction error', e);
      return { success: false };
    }
  }

  async submitReview(params: {
    orderId: number;
    targetUserId: number;
    score: number;
    text: string;
  }): Promise<Tab4ApiResult> {
    try {
      const resp = await fetch(`${this.apiBase}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.auth.getAuthHeader(),
        },
        body: JSON.stringify({
          OrderId: params.orderId,
          TargetUserId: params.targetUserId,
          Score: params.score,
          Text: params.text,
        }),
      });
      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data?.success) {
        return {
          success: false,
          error: data?.error,
          unauthorized: resp.status === 401,
        };
      }

      return { success: true };
    } catch (e) {
      console.error('Tab4OrderService.submitReview error', e);
      return { success: false };
    }
  }

  getFilteredOrders(orders: Tab4Order[], filter: Tab4OrderFilter): Tab4Order[] {
    if (filter === 'all') return orders;
    return orders.filter((order) => order.statusKey === filter);
  }

  getBlockedEditIds(orders: Tab4Order[]): Set<number> {
    const blocked = new Set<number>();
    for (const order of orders) {
      if (['pending', 'active', 'review', 'done'].includes(order.statusKey)) {
        blocked.add(order.eventId);
      }
    }
    return blocked;
  }

  getBlockedEditOnlyIds(orders: Tab4Order[]): Set<number> {
    const blocked = new Set<number>();
    for (const order of orders) {
      if (['pending', 'active', 'review'].includes(order.statusKey)) {
        blocked.add(order.eventId);
      }
    }
    return blocked;
  }

  getBlockedToggleIds(orders: Tab4Order[]): Set<number> {
    const blocked = new Set<number>();
    for (const order of orders) {
      if (['pending', 'active', 'review'].includes(order.statusKey)) {
        blocked.add(order.eventId);
      }
    }
    return blocked;
  }

  private mapOrderRow(o: any, userId: number): Tab4Order {
    const status = Number(o.OrderStatus);
    const hasReviewed = Number(o.HasReviewed || 0) > 0;
    const otherHasReviewed = Number(o.OtherHasReviewed || 0) > 0;
    const meta = this.resolveOrderStatusMeta(
      status,
      hasReviewed,
      otherHasReviewed,
    );

    let snapshot = null;
    if (o.EventSnapshot) {
      try {
        snapshot =
          typeof o.EventSnapshot === 'string'
            ? JSON.parse(o.EventSnapshot)
            : o.EventSnapshot;
      } catch {
        snapshot = null;
      }
    }

    let snapshotPhotos: string[] = [];
    if (snapshot?.Photos) {
      try {
        const raw = snapshot.Photos;
        if (typeof raw === 'string') {
          const parsed = JSON.parse(raw);
          snapshotPhotos = Array.isArray(parsed) ? parsed : [raw];
        } else if (Array.isArray(raw)) {
          snapshotPhotos = raw;
        }
      } catch {
        snapshotPhotos = [];
      }
    }

    return {
      id: Number(o.OrderId),
      eventId: Number(o.EventId),
      consumerId: Number(o.ConsumerId),
      providerId: Number(o.ProviderId),
      title: o.EventTitle || '订单',
      location: o.DetailLocation || '',
      price: o.TransactionPrice || 0,
      creatorName: o.ProviderName || '',
      consumerName: o.ConsumerName || '',
      createdAt: o.OrderCreateTime || '',
      confirmedAt: o.PaymentTime || '',
      completedAt: o.CompletionTime || '',
      cancelledAt: o.RefundTime || '',
      status: meta.label,
      statusKey: meta.key,
      statusColor: meta.color,
      role: Number(o.ConsumerId) === userId ? 'buyer' : 'seller',
      reviewCount: Number(o.ReviewCount || 0),
      hasReviewed,
      otherHasReviewed,
      snapshot,
      snapshotTitle: snapshot?.EventTitle || o.EventTitle || '',
      snapshotPrice: snapshot?.Price ?? o.TransactionPrice ?? 0,
      snapshotLocation: snapshot?.Location || '',
      snapshotDetails: snapshot?.EventDetails || '',
      snapshotCategory: snapshot?.EventCategory || '',
      snapshotPhotos,
      deliveryAddress: snapshot?.DeliveryAddress || o.DetailLocation || '',
      deliverySpecific: snapshot?.DeliverySpecific || '',
      deliveryAdditionalInfo: snapshot?.DeliveryAdditionalInfo || '',
      cancelledByName: o.CancelledByName || '',
    };
  }

  private resolveOrderStatusMeta(
    status: number,
    hasReviewed: boolean,
    otherHasReviewed: boolean,
  ): { key: string; label: string; color: string } {
    if (status === 0) {
      return { key: 'pending', label: '待确认', color: 'warning' };
    }
    if (status === 1) {
      return { key: 'active', label: '进行中', color: 'primary' };
    }
    if (status === 2) {
      if (hasReviewed && otherHasReviewed) {
        return { key: 'review', label: '双方已评价', color: 'medium' };
      }
      if (hasReviewed) {
        return {
          key: 'review',
          label: '我方已评价，等待对方',
          color: 'medium',
        };
      }
      if (otherHasReviewed) {
        return {
          key: 'review',
          label: '对方已评价，待我方评价',
          color: 'medium',
        };
      }
      return { key: 'review', label: '待评价', color: 'medium' };
    }
    if (status === 3) {
      return { key: 'done', label: '已完成', color: 'success' };
    }
    return { key: 'cancelled', label: '已取消', color: 'danger' };
  }

  private buildOrderStats(orders: Tab4Order[]): Tab4OrderStats {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.statusKey === 'pending').length,
      active: orders.filter((o) => o.statusKey === 'active').length,
      review: orders.filter((o) => o.statusKey === 'review').length,
      done: orders.filter((o) => o.statusKey === 'done').length,
      cancelled: orders.filter((o) => o.statusKey === 'cancelled').length,
    };
  }
}
