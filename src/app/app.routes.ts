import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./components/tabs/tabs.routes').then((m) => m.routes),
  },
  {
    //this path for different chat user
    path: 'chat-detail/:username',
    loadComponent: () => import('./pages/chat-detail/chat-detail.page').then(m => m.ChatDetailPage)
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search.page').then( m => m.SearchPage)
  },
];
