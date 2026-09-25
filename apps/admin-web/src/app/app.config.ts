import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { SinaatyPreset } from './theme/preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
      // مفتاح PrimeUI (Community مجاني أو Commercial) يُحقن عند البناء — انظر env.d.ts. فارغاً = لافتة ترخيص في الزاوية.
      license: (typeof PRIMEUI_LICENSE !== 'undefined' && PRIMEUI_LICENSE) || undefined,
      ripple: false,
      theme: { preset: SinaatyPreset, options: { darkModeSelector: false, cssLayer: { name: 'primeng', order: 'tailwind-base, primeng, tailwind-utilities' } } },
    }),
  ],
};
