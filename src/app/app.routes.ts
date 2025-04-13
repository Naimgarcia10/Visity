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
        path: '**', redirectTo: 'login', pathMatch: 'full'
    },
    
];