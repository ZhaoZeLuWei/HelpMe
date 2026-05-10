import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { LoginComponent } from './Components/login/login.component';
import { DashboardComponent } from './Components/dashboard/dashboard.component';
import { ListVerifyPostComponent } from './Components/list-verify-post/list-verify-post.component';
import { StaffManagementComponent } from './Components/staff-management/staff-management.component';
import { OrderManagementComponent } from './Components/order-management/order-management.component';
import { EventManagementComponent } from './Components/event-management/event-management.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'verify',
    component: ListVerifyPostComponent,
    runGuardsAndResolvers: 'always',
    canActivate: [authGuard],
  },
  {
    path: 'staff',
    component: StaffManagementComponent,
    runGuardsAndResolvers: 'always',
    canActivate: [authGuard],
  },
  {
    path: 'orders',
    component: OrderManagementComponent,
    runGuardsAndResolvers: 'always',
    canActivate: [authGuard],
  },
  {
    path: 'events',
    component: EventManagementComponent,
    runGuardsAndResolvers: 'always',
    canActivate: [authGuard],
  },
];
