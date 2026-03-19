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
      // Tab2 页面
      tab2: {
        title: '搜索',
        searchPlaceholder: '点击搜索',
        noResults: '暂无搜索结果',
        filterAll: '全部',
        filterRequest: '求助',
        filterHelp: '帮助',
        unknownDistance: '未知距离',
        loadFailed: 'Tab2 加载失败'
      },
      // Tab3 页面 (消息/聊天)
      tab3: {
        title: '消息',
        loginRequired: '您好！请登录',
        loginRequiredSub: '欢迎使用 HelpMe',
        loginHint: '登录后查看消息列表',
        loginBtn: '立即登录',
        registerBtn: '注册账号',
        notification: '通知',
        systemNotification: '系统通知',
        noNewNotification: '暂无新通知',
        noMessage: '暂无消息',
        loginToast: '请您登录或注册',
        loadRoomsFailed: '加载聊天列表失败',
        unknownUser: '用户'
      },
      // Tab4 页面 (个人中心)
      tab4: {
        title: '个人中心',
        // 未登录状态
        welcome: '欢迎使用 HelpMe',
        loginHint: '登录后查看个人中心',
        loginBtn: '立即登录',
        registerBtn: '注册账号',
        // 用户信息
        locationNotSet: '未设置位置',
        introDefault: '个人的介绍，等待以后再来探索吧！',
        buyerRating: '买家评分',
        serviceRating: '服务评分',
        orderCount: '服务单数',
        // 按钮
        editProfile: '编辑资料',
        logout: '登出',
        follow: '关注',
        favorite: '收藏',
        view: '浏览',
        // 标签页
        tabPublished: '我发布的',
        tabInProgress: '正进行的',
        tabCompleted: '已完成',
        tabReview: '评价',
        // 任务列表
        publishTime: '发布时间',
        delete: '删除',
        edit: '编辑',
        viewDetails: '详情',
        review: '评价',
        deleting: '删除中...',
        noTasks: '暂无相关任务',
        // 删除确认弹窗
        deleteConfirmTitle: '确认删除',
        deleteConfirmMsg: '删除后不可恢复，是否继续？',
        cancel: '取消',
        confirm: '确定',
        // 编辑事件弹窗
        editEventTitle: '编辑事件',
        close: '关闭',
        titleLabel: '标题',
        titlePlaceholder: '简明描述（如：上门电脑维修）',
        typeLabel: '类型',
        typePlaceholder: '请选择事件类型',
        typeRequest: '求助',
        typeHelp: '帮助',
        categoryLabel: '类别',
        categoryPlaceholder: '如：电脑维修',
        locationLabel: '位置',
        locationPlaceholder: '详细地址',
        priceLabel: '价格 (¥)',
        pricePlaceholder: '0 表示无偿帮助',
        detailsLabel: '详细描述',
        detailsPlaceholder: '补充说明需求/服务内容',
        editPhotoLabel: '编辑图片（可选）',
        uploadPhoto: '点击上传照片',
        uploadHint: '最多可上传 5 张照片，支持 JPG/PNG',
        save: '保存',
        saving: '保存中...',
        // 编辑个人资料弹窗
        editProfileTitle: '编辑个人资料',
        changeAvatar: '更换头像',
        uploadAvatar: '上传头像',
        avatarHint: '支持jpg/png，最大5MB',
        userNameLabel: '用户名',
        userNamePlaceholder: '请输入用户名（2-20个字符）',
        realNameLabel: '真实姓名',
        realNamePlaceholder: '请输入真实姓名（2-20个字符）',
        idCardLabel: '身份证号',
        idCardPlaceholder: '请输入18位身份证号',
        locationLabelProfile: '所在地',
        locationPlaceholderProfile: '例如：广西柳州',
        birthDateLabel: '出生日期',
        introLabel: '个人介绍',
        introPlaceholder: '简单介绍一下自己吧（选填，最多200字）',
        requiredHint: '* 标记为必填项',
        // 认证状态
        verified: '已认证',
        rejected: '被驳回',
        pending: '待审核',
        notVerified: '未认证',
        // 状态
        statusPublished: '已发布',
        statusInProgress: '进行中',
        statusCompleted: '已完成',
        statusPendingReview: '待评价',
        statusUnknown: '未知',
        // Toast 消息
        logoutSuccess: '已成功登出',
        deleteSuccess: '删除成功',
        saveSuccess: '保存成功',
        notLoggedIn: '未登录，无法操作',
        loginExpired: '未登录或登录已过期',
        networkError: '网络错误，稍后重试',
        pleaseCompleteRequired: '请完善必填项后再提交',
        titleRequired: '标题必填',
        categoryRequired: '类别必填',
        locationRequired: '位置必填',
        detailsRequired: '详细描述必填',
        priceInvalid: '价格需在 0 ~ 1000000 之间'
      },
      // 共享组件
      shared: {
        // universal-search 组件
        search: {
          placeholder: '输入需求描述...',
          priceRange: '价格区间',
          locationFilter: '地点筛选',
          reset: '重置',
          noResults: '暂无符合条件的需求',
          // 价格筛选模态框
          priceFilterTitle: '价格筛选',
          close: '关闭',
          minPrice: '最低',
          maxPrice: '最高',
          // 地点筛选模态框
          locationFilterTitle: '输入地点关键词',
          locationLabel: '地点关键词 (匹配地址)',
          locationPlaceholder: '例如: 广科, 001...'
        },
        // show-event 组件
        eventCard: {
          eventImage: '事件图片',
          userAvatar: '用户头像'
        }
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
      // Tab2 页面
      tab2: {
        title: 'Search',
        searchPlaceholder: 'Click to Search',
        noResults: 'No results found',
        filterAll: 'All',
        filterRequest: 'Request',
        filterHelp: 'Help',
        unknownDistance: 'Unknown distance',
        loadFailed: 'Tab2 load failed'
      },
      // Tab3 页面 (消息/聊天)
      tab3: {
        title: 'Messages',
        loginRequired: 'Hello! Please Login',
        loginRequiredSub: 'Welcome to HelpMe',
        loginHint: 'Login to view messages',
        loginBtn: 'Login Now',
        registerBtn: 'Register',
        notification: 'Notification',
        systemNotification: 'System Notification',
        noNewNotification: 'No new notifications',
        noMessage: 'No messages',
        loginToast: 'Please login or register',
        loadRoomsFailed: 'Failed to load chat list',
        unknownUser: 'User'
      },
      // Tab4 页面 (个人中心)
      tab4: {
        title: 'Profile',
        // 未登录状态
        welcome: 'Welcome to HelpMe',
        loginHint: 'Login to view your profile',
        loginBtn: 'Login Now',
        registerBtn: 'Register',
        // 用户信息
        locationNotSet: 'Location not set',
        introDefault: 'Your introduction is waiting to be explored!',
        buyerRating: 'Buyer Rating',
        serviceRating: 'Service Rating',
        orderCount: 'Orders',
        // 按钮
        editProfile: 'Edit Profile',
        logout: 'Logout',
        follow: 'Follow',
        favorite: 'Favorite',
        view: 'Views',
        // 标签页
        tabPublished: 'Published',
        tabInProgress: 'In Progress',
        tabCompleted: 'Completed',
        tabReview: 'Reviews',
        // 任务列表
        publishTime: 'Published',
        delete: 'Delete',
        edit: 'Edit',
        viewDetails: 'Details',
        review: 'Review',
        deleting: 'Deleting...',
        noTasks: 'No tasks yet',
        // 删除确认弹窗
        deleteConfirmTitle: 'Confirm Delete',
        deleteConfirmMsg: 'This action cannot be undone. Continue?',
        cancel: 'Cancel',
        confirm: 'Confirm',
        // 编辑事件弹窗
        editEventTitle: 'Edit Event',
        close: 'Close',
        titleLabel: 'Title',
        titlePlaceholder: 'Brief description (e.g., Computer Repair)',
        typeLabel: 'Type',
        typePlaceholder: 'Select event type',
        typeRequest: 'Request',
        typeHelp: 'Help',
        categoryLabel: 'Category',
        categoryPlaceholder: 'e.g., Computer Repair',
        locationLabel: 'Location',
        locationPlaceholder: 'Detailed address',
        priceLabel: 'Price (¥)',
        pricePlaceholder: '0 for free',
        detailsLabel: 'Details',
        detailsPlaceholder: 'Describe your needs or services',
        editPhotoLabel: 'Edit Photos (Optional)',
        uploadPhoto: 'Click to upload',
        uploadHint: 'Max 5 photos, JPG/PNG supported',
        save: 'Save',
        saving: 'Saving...',
        // 编辑个人资料弹窗
        editProfileTitle: 'Edit Profile',
        changeAvatar: 'Change Avatar',
        uploadAvatar: 'Upload Avatar',
        avatarHint: 'JPG/PNG, max 5MB',
        userNameLabel: 'Username',
        userNamePlaceholder: 'Enter username (2-20 chars)',
        realNameLabel: 'Real Name',
        realNamePlaceholder: 'Enter real name (2-20 chars)',
        idCardLabel: 'ID Card Number',
        idCardPlaceholder: 'Enter 18-digit ID number',
        locationLabelProfile: 'Location',
        locationPlaceholderProfile: 'e.g., Liuzhou, Guangxi',
        birthDateLabel: 'Birth Date',
        introLabel: 'Bio',
        introPlaceholder: 'Introduce yourself (optional, max 200 chars)',
        requiredHint: '* Required fields',
        // 认证状态
        verified: 'Verified',
        rejected: 'Rejected',
        pending: 'Pending',
        notVerified: 'Not Verified',
        // 状态
        statusPublished: 'Published',
        statusInProgress: 'In Progress',
        statusCompleted: 'Completed',
        statusPendingReview: 'Pending Review',
        statusUnknown: 'Unknown',
        // Toast 消息
        logoutSuccess: 'Logged out successfully',
        deleteSuccess: 'Deleted successfully',
        saveSuccess: 'Saved successfully',
        notLoggedIn: 'Please login first',
        loginExpired: 'Login expired, please login again',
        networkError: 'Network error, please try again',
        pleaseCompleteRequired: 'Please complete required fields',
        titleRequired: 'Title is required',
        categoryRequired: 'Category is required',
        locationRequired: 'Location is required',
        detailsRequired: 'Details are required',
        priceInvalid: 'Price must be between 0 and 1,000,000'
      },
      // 共享组件
      shared: {
        // universal-search 组件
        search: {
          placeholder: 'Enter your needs...',
          priceRange: 'Price Range',
          locationFilter: 'Location',
          reset: 'Reset',
          noResults: 'No matching results',
          // 价格筛选模态框
          priceFilterTitle: 'Price Filter',
          close: 'Close',
          minPrice: 'Min',
          maxPrice: 'Max',
          // 地点筛选模态框
          locationFilterTitle: 'Enter Location Keyword',
          locationLabel: 'Location Keyword (Match Address)',
          locationPlaceholder: 'e.g., Campus, 001...'
        },
        // show-event 组件
        eventCard: {
          eventImage: 'Event Image',
          userAvatar: 'User Avatar'
        }
      },
      // Tab5 页面
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
        // 表单通用
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
