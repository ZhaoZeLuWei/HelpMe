# 完善search.page搜索页面实现计划

## 1. 修改search.page.html

### 1.1 调整头部导航栏
- 将当前的"搜索"标题替换为搜索图标
- 在左侧添加返回图标按钮
- 在右侧添加AI辅助查找图标按钮

### 1.2 搜索栏优化
- 确保搜索栏与图标布局协调

## 2. 修改search.page.ts

### 2.1 添加IonIcon导入
- 在导入列表中添加IonIcon组件

### 2.2 实现返回功能
- 将现有onCancel()方法绑定到返回图标点击事件
- 确保返回逻辑正确无误

### 2.3 添加AI辅助查找按钮事件
- 实现aiSearch()方法，提供视觉反馈（如console.log）
- 为后续功能开发预留接口

## 3. 样式优化（search.page.scss）
- 确保图标在不同设备尺寸上正确显示
- 保持与应用整体UI风格的统一性
- 为AI辅助查找按钮添加适当的视觉反馈样式

## 4. 技术细节

### 4.1 图标选择
- 搜索图标：使用Ionic的search-outline图标
- 返回图标：使用Ionic的chevron-back-outline图标
- AI辅助查找图标：使用Ionic的sparkles-outline图标

### 4.2 响应式设计
- 使用Ionic的内置样式系统确保图标在不同设备尺寸上正确显示
- 确保图标间距和大小符合设计规范

### 4.3 视觉反馈
- 为AI辅助查找按钮添加点击反馈
- 添加适当的提示信息（如Toast）说明该功能暂未开发

## 5. 代码实现

### 5.1 HTML结构
```html
<ion-header>
  <ion-toolbar>
    <ion-buttons slot="start">
      <ion-button (click)="onCancel()">
        <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
      </ion-button>
    </ion-buttons>
    <ion-title>
      <ion-icon name="search-outline"></ion-icon>
    </ion-title>
    <ion-buttons slot="end">
      <ion-button (click)="aiSearch()">
        <ion-icon slot="icon-only" name="sparkles-outline"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content class="ion-padding">
  <ion-searchbar
    [(ngModel)]="keyword"
    placeholder="输入需求描述"
    (keyup.enter)="onSearch()"
  ></ion-searchbar>
</ion-content>
```

### 5.2 TypeScript实现
```typescript
// 添加IonIcon到导入列表
import { IonIcon } from '@ionic/angular/standalone';

// 在imports数组中添加IonIcon
imports: [
  // 其他导入
  IonIcon,
],

// 实现aiSearch方法
aiSearch() {
  console.log('AI辅助搜索功能暂未开发');
  // 这里可以添加Toast提示
}
```

## 6. 测试验证
- 确保返回按钮功能正常
- 确保AI辅助查找按钮有视觉反馈
- 确保所有图标在不同设备尺寸上正确显示
- 确保整体UI风格统一

这个计划将确保搜索页面按照用户要求进行完善，同时为后续功能开发预留接口和样式基础。