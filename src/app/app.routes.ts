import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'cloud-next',
    pathMatch: 'full'
  },
  {
    path: 'cloud-next',
    loadChildren: () =>
      import('./features/cloud-next/cloud-next.routes').then(m => m.CLOUD_NEXT_ROUTES)
  }
];
