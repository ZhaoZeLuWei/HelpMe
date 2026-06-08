import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private baseUrl = `${environment.apiBase}/api`;
  constructor(private http: HttpClient) {}

  // 调用翻译接口
  translateText(params: {
    sourceText: string;
    sourceLang?: string;
    targetLang?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/translate`, params);
  }
}
