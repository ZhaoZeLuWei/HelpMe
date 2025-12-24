import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    //this path for different chat user
    path: 'chat-detail/:username',
    loadComponent: () => import('./chat-detail/chat-detail.page').then( m => m.ChatDetailPage)
  },
];
