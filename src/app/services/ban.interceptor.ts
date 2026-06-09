import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * HTTP 拦截器：检测封禁响应（403 + "BANNED"），跳转申诉页
 */
export const banInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err) => {
      if (err.status === 403 && err.error?.error === 'BANNED') {
        const auth = inject(AuthService);
        const router = inject(Router);
        const phone =
          auth.currentUser?.PhoneNumber || auth.currentUser?.phoneNumber || '';
        auth.logout();
        if (phone) {
          sessionStorage.setItem('ban_appeal_phone', phone);
          router.navigate(['/ban-appeal'], {
            state: { phone },
            replaceUrl: true,
          });
        } else {
          router.navigate(['/tabs/tab4'], { replaceUrl: true });
        }
      }
      return throwError(() => err);
    }),
  );
};
