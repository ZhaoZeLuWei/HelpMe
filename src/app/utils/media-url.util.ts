import { environment } from '../../environments/environment';

/** 将相对路径转为可访问的完整 URL，空值返回默认头像 */
export function resolveMediaUrl(
  path?: string | null,
  fallback = '/assets/icon/user.svg',
): string {
  if (!path || !String(path).trim()) {
    return fallback;
  }
  const value = String(path).trim();
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }
  const base = environment.apiBase.replace(/\/$/, '');
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return `${base}${normalized}`;
}
