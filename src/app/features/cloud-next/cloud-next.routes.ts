import { Routes } from '@angular/router';

export const CLOUD_NEXT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/onboarding-page/onboarding-page.component').then(
        m => m.OnboardingPageComponent
      )
  }
];
