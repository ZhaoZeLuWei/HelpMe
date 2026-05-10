import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private baseUrl = 'http://localhost:3000/api'; // 和后端地址一致
  constructor(private http: HttpClient) { }

  // 调用翻译接口
  translateText(params: {
    sourceText: string;
    sourceLang?: string;
    targetLang?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/translate`, params);
  }

  // 批量翻译
  batchTranslate(params: {
    texts: string[];
    sourceLang?: string;
    targetLang?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/translate/batch`, params);
  }
}