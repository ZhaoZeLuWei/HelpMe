import { Routes } from '@angular/router';
import { ListVerifyPostComponent } from './Components/list-verify-post/list-verify-post.component';
import { StaffManagementComponent } from './Components/staff-management/staff-management.component';
import { OrderManagementComponent } from './Components/order-management/order-management.component';
import { EventManagementComponent } from './Components/event-management/event-management.component';

export const routes: Routes = [
  {
    path: '',
    component: ListVerifyPostComponent,
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'staff',
    component: StaffManagementComponent,
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'orders',
    component: OrderManagementComponent,
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'events',
    component: EventManagementComponent,
    runGuardsAndResolvers: 'always',
  },
];
