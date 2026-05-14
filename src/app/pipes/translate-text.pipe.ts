import { Pipe, PipeTransform, inject } from '@angular/core';
import { DynamicTranslationService } from '../services/dynamic-translation.service';

@Pipe({ name: 'tText', standalone: true, pure: false })
export class TranslateTextPipe implements PipeTransform {
  private dynTrans = inject(DynamicTranslationService);

  // 检测文本是否包含中文字符
  private hasChinese(text: string): boolean {
    return /[一-鿿㐀-䶿]/.test(text);
  }

  transform(value: string | undefined): string {
    if (!value) return value ?? '';

    // 读取翻译批次版本号，确保翻译完成后管道被重新求值
    const _version = this.dynTrans.batchVersion;

    const translated = this.dynTrans.get(value);
    if (translated !== null) {
      return translated;
    }

    // 只有包含中文的文本才注册翻译（服务器可能已翻译）
    if (this.hasChinese(value)) {
      this.dynTrans.register([value]);
    }
    return value;
  }
}
