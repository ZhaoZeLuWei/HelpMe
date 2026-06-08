import { ApplicationRef, Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LanguageService } from './language.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DynamicTranslationService {
  private http = inject(HttpClient);
  private langService = inject(LanguageService);
  private appRef = inject(ApplicationRef);
  private auth = inject(AuthService);

  private readonly apiBase = environment.apiBase;
  private readonly sourceLang = 'zh';

  // 内存缓存: "zh:en:原文" → "翻译后的英文"
  private cache = new Map<string, string>();

  // 已被组件注册、等待翻译的文本集合
  private pendingTexts = new Set<string>();

  // 翻译进行中状态
  public isTranslating$ = new BehaviorSubject<boolean>(false);

  // 翻译批次计数器，管道读取此值以在翻译完成后重新求值
  public batchVersion = 0;

  constructor() {
    // 监听语言切换，自动触发动态翻译
    this.langService.currentLang$.subscribe((lang) => {
      if (lang !== this.sourceLang) {
        // 延迟等待 Angular 完成变更检测和所有管道注册
        setTimeout(() => {
          this.translateAll().subscribe({
            error: (err) => console.error('自动翻译失败', err),
          });
        }, 150);
      }
    });
  }

  /**
   * 同步缓存查询。组件/管道在每次渲染时调用。
   * 如果当前语言是中文（与 DB 一致），返回 null 表示"无需翻译，用原文"。
   * 如果当前语言是英文，返回缓存的翻译文本，没有缓存则返回 null。
   */
  get(text: string): string | null {
    if (!text || !text.trim()) return null;
    const targetLang = this.langService.getCurrentLang();
    if (targetLang === this.sourceLang) return null;
    const key = `${this.sourceLang}:${targetLang}:${text}`;
    return this.cache.get(key) ?? null;
  }

  /**
   * 注册需要翻译的文本。幂等（重复文本不会增加开销）。
   */
  register(texts: string[]): void {
    const targetLang = this.langService.getCurrentLang();
    if (targetLang === this.sourceLang) return; // 中文模式无需注册

    for (const t of texts) {
      if (t && t.trim()) {
        const key = `${this.sourceLang}:${targetLang}:${t}`;
        if (!this.cache.has(key)) {
          this.pendingTexts.add(t);
        }
      }
    }
  }

  /**
   * 批量翻译所有已注册且未缓存的文本。
   * 可选传入 texts 数组直接注册并翻译。
   */
  translateAll(texts?: string[]): Observable<void> {
    if (texts && texts.length > 0) {
      this.register(texts);
    }

    const targetLang = this.langService.getCurrentLang();
    if (targetLang === this.sourceLang) {
      return of(undefined);
    }

    const uncached = [...this.pendingTexts].filter((t) => {
      const key = `${this.sourceLang}:${targetLang}:${t}`;
      return !this.cache.has(key);
    });

    this.pendingTexts.clear();

    if (uncached.length === 0) {
      return of(undefined);
    }

    this.isTranslating$.next(true);
    this.batchVersion++;

    const chunks = this.chunkArray(uncached, 20);

    return this.processChunks(chunks, targetLang).pipe(
      tap(() => {
        this.isTranslating$.next(false);
        // 触发全局变更检测，使管道重新求值并渲染译文
        this.appRef.tick();
      }),
    );
  }

  /**
   * 清除所有缓存（语言方向改变时可用）
   */
  clear(): void {
    this.cache.clear();
    this.pendingTexts.clear();
  }

  private processChunks(
    chunks: string[][],
    targetLang: string,
  ): Observable<void> {
    const run = async () => {
      for (const chunk of chunks) {
        try {
          const res = await firstValueFrom(
            this.http.post<{
              success: boolean;
              results: Record<string, string>;
            }>(
              `${this.apiBase}/api/translate/batch`,
              {
                texts: chunk,
                sourceLang: this.sourceLang,
                targetLang,
              },
              { headers: this.auth.getAuthHeader() },
            ),
          );

          if (res?.success && res.results) {
            for (const [original, translated] of Object.entries(res.results)) {
              if (translated !== original) {
                const key = `${this.sourceLang}:${targetLang}:${original}`;
                this.cache.set(key, translated);
              }
            }
          }
        } catch (err) {
          console.error('批量翻译请求失败', err);
        }
      }
    };
    return new Observable((subscriber) => {
      run().then(() => {
        subscriber.next();
        subscriber.complete();
      });
    });
  }

  private chunkArray(arr: string[], size: number): string[][] {
    const result: string[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }
}
