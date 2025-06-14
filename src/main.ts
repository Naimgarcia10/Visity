import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { appConfig } from './app/app.config';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { environment } from './environment/firebaseConnection';

const app = initializeApp(environment.firebase);
const auth = getAuth(app);

// Esperar la carga del usuario antes de iniciar Angular
const waitForAuth = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    console.log('[AuthState] Usuario:', user);
    resolve(user);
  });
});

waitForAuth.then(async (user: any) => {
  const appRef = await bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes),
      ...appConfig.providers,
    ],
  });

  const injector = appRef.injector;
  const router = injector.get(Router);
  const currentUrl = window.location.pathname;
  const publicRoutes = ['/login', '/register'];

  if (!user && !publicRoutes.includes(currentUrl)) {
    console.log('[Navigation] Redirigiendo a /login');
    router.navigateByUrl('/login');
  }

  const splashEl = document.getElementById('splash-screen');
  if (splashEl) splashEl.remove();
});

/* import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { appConfig } from './app/app.config';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { environment } from './environment/firebaseConnection';

console.log('[Main] Inicializando Firebase...');
const app = initializeApp(environment.firebase);
const auth = getAuth(app);

console.log('[Main] Esperando estado de autenticación...');

// Mostrar un error si Firebase nunca responde en X tiempo (por si se cuelga)
const TIMEOUT_MS = 10000;
let timeoutHandler = setTimeout(() => {
  console.error('[ERROR] Tiempo de espera superado esperando a Firebase Auth.');
}, TIMEOUT_MS);

// Esperar a que Firebase determine el usuario
onAuthStateChanged(auth, async (user) => {
  clearTimeout(timeoutHandler);
  console.log('[AuthState] Usuario detectado:', user);

  try {
    const appRef = await bootstrapApplication(AppComponent, {
      providers: [
        provideRouter(routes),
        ...appConfig.providers,
      ],
    });

    console.log('[Bootstrap] Angular iniciado correctamente');

    const injector = appRef.injector;
    const router = injector.get(Router);

    const currentUrl = window.location.pathname;
    const publicRoutes = ['/login', '/register'];

    if (!user && !publicRoutes.includes(currentUrl)) {
      console.log('[Navigation] Usuario no autenticado. Redirigiendo a /login');
      router.navigateByUrl('/login');
    } else {
      console.log('[Navigation] Usuario autenticado o en ruta pública');
    }

    // Quitar splash screen si existe
    const splashEl = document.getElementById('splash-screen');
    if (splashEl) {
      splashEl.remove();
      console.log('[Splash] Eliminado correctamente');
    }
  } catch (err) {
    console.error('[Bootstrap Error] No se pudo iniciar Angular:', err);
  }
});
 */