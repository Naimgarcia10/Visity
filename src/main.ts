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

onAuthStateChanged(auth, async (user) => {
  console.log('[AuthState] Usuario:', user);

  const appRef = await bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes),
      ...appConfig.providers,
    ],
  });

  const injector = appRef.injector;
  const router = injector.get(Router);

  if (!user) {
    console.log('[Navigation] Redirigiendo a /login');
    router.navigateByUrl('/login');
  } 

  const splashEl = document.getElementById('splash-screen');
  if (splashEl) splashEl.remove();
});
