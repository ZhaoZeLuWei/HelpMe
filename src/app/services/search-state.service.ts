import { Injectable, signal } from '@angular/core';
import { EventCardData } from '../components/show-event/show-event.component';

export interface AiSearchResults {
  keyword: string;
  recommendation: string;
  matchedEvents: any[];
  matchedProviders: any[];
}

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  // 本次搜索结果（求助+帮助合并）
  private _results = signal<EventCardData[]>([]);
  readonly results = this._results.asReadonly();

  // AI 增强搜索结果
  private _aiResults = signal<AiSearchResults | null>(null);
  readonly aiResults = this._aiResults.asReadonly();

  setResults(list: EventCardData[]) {
    this._results.set(list);
  }

  setAiResults(results: AiSearchResults) {
    this._aiResults.set(results);
  }

  clearAiResults() {
    this._aiResults.set(null);
  }

  clear() {
    this._results.set([]);
    this._aiResults.set(null);
  }
}
