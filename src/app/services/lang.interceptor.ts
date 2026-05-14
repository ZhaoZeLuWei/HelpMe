import { HttpInterceptorFn } from '@angular/common/http';

/**
 * HTTP 拦截器：自动将当前语言附加到 API 请求的 query 参数
 */
export const langInterceptor: HttpInterceptorFn = (req, next) => {
  const lang = localStorage.getItem('app_lang') || 'zh';
  if (lang !== 'zh' && req.url.includes('/api/')) {
    const sep = req.url.includes('?') ? '&' : '?';
    const newReq = req.clone({
      url: `${req.url}${sep}lang=${lang}`,
    });
    return next(newReq);
  }
  return next(req);
};
