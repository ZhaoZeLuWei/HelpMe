import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLangSubject = new BehaviorSubject<'zh' | 'en'>('zh');
  public currentLang$ = this.currentLangSubject.asObservable();

  private translations = {
    zh: {
      nav: {
        home: '首页',
        search: '搜索',
        publish: '发布',
        msg: '消息',
        me: '我的'
      },
      // Tab1 页面
      tab1: {
        btnText: '中文',
        modalTitle: '提示 / Alert',
        modalBody: '您确定要切换语言吗？<br><span class="sub-text">Are you sure you want to switch language?</span>',
        cancel: '取消 / Cancel',
        confirm: '确定 / OK',
        searchPlaceholder: '点击搜索',
        requestTitle: '求助',
        helpTitle: '帮助',
        noEvent: '还没有求助事件',
        noHelp: '还没有帮助事件',
        more: '更多'
      },
      // Tab5 页面
      tab5: {
        header: '发布服务',
        hero: '互帮互助一家亲',
        reqTitle: '求助',
        reqDesc: '我有困难时发布',
        helpTitle: '帮助',
        helpDesc: '你要帮助他人时发布',
        authTitle: '认证资格',
        authDesc: '全职 兼职 商家',
        closeHint: '关闭当前页面，返回上一级',
        // 表单通用
        form: {
          reqHeader: '发布求助',
          helpHeader: '发布帮助',
          authHeader: '认证资格',
          title: '标题',
          category: '类别',
          location: '位置',
          price: '期望价格 (¥)',
          details: '详细描述',
          uploadPhoto: '上传照片（可选）',
          uploadHint: '最多可上传 5 张照片，支持 JPG/PNG',
          uploadIdCard: '身份证照片',
          uploadCert: '职业证书照片（最多可上传 3 张）',
          realName: '真实姓名',
          phone: '手机号',
          idCard: '身份证号',
          area: '所在区域',
          role: '身份类型',
          intro: '个人简介',
          cancel: '取消',
          submit: '提交',
          submitReq: '提交求助',
          submitHelp: '发布帮助',
          submitAuth: '提交认证'
        },
        placeholder: {
          reqTitle: '简明描述你的需求（如：求修电脑）',
          reqCat: '如：电脑维修',
          reqLoc: '详细地址（如：XX校区1栋101室）',
          reqPrice: '0 表示无偿帮助',
          reqDetail: '请说明具体困难、时间要求、紧急程度等',
          helpTitle: '如：提供电脑维修服务',
          helpCat: '如：电脑维修等',
          helpLoc: '如：XX小区',
          helpPrice: '可填小数（如 59.99） 免费则填写0',
          helpDetail: '说明你能提供什么、时间安排、限制条件等',
          realName: '与身份证一致',
          phone: '11位中国大陆手机号',
          idCard: '18位身份证号码',
          area: '如：XX小区',
          intro: '简要介绍你的服务经验或特长（选填）'
        }
      }
    },
    en: {
      nav: {
        home: 'Home',
        search: 'Search',
        publish: 'Publish',
        msg: 'Message',
        me: 'Me'
      },
      tab1: {
        btnText: 'EN',
        modalTitle: 'Alert',
        modalBody: 'Are you sure you want to switch language?',
        cancel: 'Cancel',
        confirm: 'OK',
        searchPlaceholder: 'Click to Search',
        requestTitle: 'Request',
        helpTitle: 'Help',
        noEvent: 'No requests yet',
        noHelp: 'No help events yet',
        more: 'More'
      },
      tab5: {
        header: 'Publish Service',
        hero: 'Helping each other',
        reqTitle: 'Request',
        reqDesc: 'Post when in need',
        helpTitle: 'Offer',
        helpDesc: 'Post to help others',
        authTitle: 'Verification',
        authDesc: 'Full-time Part-time Merchant',
        closeHint: 'Close and return',
        form: {
          reqHeader: 'Post Request',
          helpHeader: 'Post Offer',
          authHeader: 'Verification',
          title: 'Title',
          category: 'Category',
          location: 'Location',
          price: 'Price (¥)',
          details: 'Details',
          uploadPhoto: 'Upload Photos (Optional)',
          uploadHint: 'Max 5 photos, JPG/PNG',
          uploadIdCard: 'ID Card Photos',
          uploadCert: 'Certificates (Max 3)',
          realName: 'Real Name',
          phone: 'Phone Number',
          idCard: 'ID Card Number',
          area: 'Area',
          role: 'Role Type',
          intro: 'Bio',
          cancel: 'Cancel',
          submit: 'Submit',
          submitReq: 'Submit Request',
          submitHelp: 'Post Offer',
          submitAuth: 'Submit Verification'
        },
        placeholder: {
          reqTitle: 'Briefly describe your need',
          reqCat: 'e.g. Computer Repair',
          reqLoc: 'Detailed Address',
          reqPrice: '0 for free',
          reqDetail: 'Describe difficulty, time, urgency...',
          helpTitle: 'e.g. Computer Repair Service',
          helpCat: 'e.g. Repair',
          helpLoc: 'e.g. XX Community',
          helpPrice: 'e.g. 59.99',
          helpDetail: 'Describe what you can offer...',
          realName: 'Match ID Card',
          phone: '11 digits CN Mobile',
          idCard: '18 digits ID Number',
          area: 'e.g. XX Community',
          intro: 'Briefly introduce your experience'
        }
      }
    }
  };

  constructor() {}

  getTranslations(lang: 'zh' | 'en') {
    return this.translations[lang];
  }

  toggleLanguage() {
    const newLang = this.currentLangSubject.value === 'zh' ? 'en' : 'zh';
    this.currentLangSubject.next(newLang);
  }
  
  getCurrentLang() {
    return this.currentLangSubject.value;
  }
}