// src/app/services/search-state.service.ts
import { Injectable, signal } from '@angular/core';
import { EventCardData } from '../components/show-event/show-event.component'; // 按你实际路径改

@Injectable({ providedIn: 'root' }) // 全局单例
export class SearchStateService {
  // 本次搜索结果（求助+帮助合并）
  private _results = signal<EventCardData[]>([]);
  readonly results = this._results.asReadonly();

  setResults(list: EventCardData[]) {
    this._results.set(list);
  }

  clear() {
    this._results.set([]);
  }
}
