import { Routes } from '@angular/router';

export const routes: Routes = [
    {   
        path: '', redirectTo: 'login', pathMatch: 'full'
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
        path: 'home',
        loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    },
    {
        path: 'feed',
        loadComponent: () => import('./components/feed/feed.component').then(m => m.FeedComponent),
    },
    {
        path: '**', redirectTo: 'login', pathMatch: 'full'
    },
    
];