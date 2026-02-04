import { Routes } from '@angular/router';
import {ListVerifyPostComponent} from './Components/list-verify-post/list-verify-post.component';

export const routes: Routes = [
  { path: '', component: ListVerifyPostComponent , runGuardsAndResolvers: 'always'},
];
