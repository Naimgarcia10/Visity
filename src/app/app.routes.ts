import { Routes } from '@angular/router';
import { AuthGuard } from './shared/auth.guard';
import path from 'path';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'feed',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'feed',
    loadComponent: () => import('./components/feed/feed.component').then(m => m.FeedComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'profile/:username',
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    redirectTo: 'feed',
    pathMatch: 'full',
  },
];