import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface AiFillFormResult {
  title: string;
  tags: string[];
  details: string;
}

export interface AiSearchResult {
  recommendation: string;
  matchedEvents: any[];
  matchedProviders: any[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly API_BASE = environment.apiBase;
  private readonly auth = inject(AuthService);

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.auth.getAuthHeader(),
    };
  }

  /** 1. AI 智能填表：根据输入生成标题、标签、详细描述 */
  async fillForm(
    input: string,
    type: 'request' | 'help' = 'request',
  ): Promise<AiFillFormResult | null> {
    try {
      const res = await fetch(`${this.API_BASE}/api/ai/fill-form`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ input, type }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        console.warn('AI fillForm 失败:', data?.error);
        return null;
      }
      return data.data as AiFillFormResult;
    } catch (err) {
      console.error('AI fillForm 错误:', err);
      return null;
    }
  }

  /** 2. AI 增强搜索 */
  async enhanceSearch(
    keyword: string,
    location?: string,
  ): Promise<AiSearchResult | null> {
    try {
      const res = await fetch(`${this.API_BASE}/api/ai/enhance-search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ keyword, location }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        console.warn('AI enhanceSearch 失败:', data?.error);
        return null;
      }
      return data.data as AiSearchResult;
    } catch (err) {
      console.error('AI enhanceSearch 错误:', err);
      return null;
    }
  }
}
