import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type UploadImagesOptions = {
  /** 注册等未登录场景，走 /upload/register-avatar */
  guest?: boolean;
};

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly apiBase = environment.apiBase;
  private readonly auth = inject(AuthService);

  async uploadImages(
    files: File | File[],
    options?: UploadImagesOptions,
  ): Promise<string[]> {
    const list = Array.isArray(files) ? files : [files];
    if (list.length === 0) {
      return [];
    }

    const fd = new FormData();
    for (const file of list) {
      fd.append('images', file);
    }

    const url = options?.guest
      ? `${this.apiBase}/upload/register-avatar`
      : `${this.apiBase}/upload/images`;
    const headers = options?.guest
      ? undefined
      : { ...this.auth.getAuthHeader() };

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: fd,
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.success || !Array.isArray(data.paths)) {
      throw new Error(data?.error || 'upload failed');
    }

    return data.paths as string[];
  }

  async deleteUploadedFile(filePath: string): Promise<void> {
    try {
      await fetch(`${this.apiBase}/upload/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
    } catch (e) {
      console.error('UploadService.deleteUploadedFile error', e);
    }
  }
}
