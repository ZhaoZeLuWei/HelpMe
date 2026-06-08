/**
 * 导航相关工具函数
 */
import { Location } from '@angular/common';
import { Router } from '@angular/router';

/**
 * 返回上一页，若无历史记录则跳转到首页
 */
export function goBack(location: Location, router: Router): void {
  if (window.history.length > 1) {
    location.back();
  } else {
    router.navigate(['/tabs/tab1']);
  }
}

/**
 * 跳转到首页
 */
export function goHome(router: Router): void {
  router.navigate(['/tabs/tab1']);
}
