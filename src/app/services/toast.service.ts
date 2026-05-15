/**
 * 统一 Toast 提示服务
 */
import { ToastController } from '@ionic/angular';

export interface ToastOptions {
  duration?: number;
  color?: string;
  position?: 'top' | 'bottom' | 'middle';
  positionAnchor?: string;
}

/**
 * 显示 Toast 提示
 * @param toastCtrl - ToastController 实例
 * @param message - 提示消息
 * @param options - 可选配置（duration, color, position 等）
 */
export async function showToast(
  toastCtrl: ToastController,
  message: string,
  options: ToastOptions = {},
): Promise<void> {
  const toast = await toastCtrl.create({
    message,
    duration: options.duration ?? 2000,
    color: options.color,
    position: options.position ?? 'bottom',
    positionAnchor: options.positionAnchor ?? 'main-tab-bar',
  });
  await toast.present();
}
