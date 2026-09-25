import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

/** المسارات نفسها التي كانت في النسخة السابقة — الروابط المحفوظة وفحص Playwright لا يتغيّران. */
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.LoginPage) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/overview').then((m) => m.OverviewPage) },
      { path: 'ops', loadComponent: () => import('./pages/ops').then((m) => m.OpsPage) },
      { path: 'organizations', loadComponent: () => import('./pages/organizations').then((m) => m.OrganizationsPage) },
      { path: 'organizations/:id', loadComponent: () => import('./pages/organization').then((m) => m.OrganizationPage) },
      { path: 'abandoned', loadComponent: () => import('./pages/abandoned').then((m) => m.AbandonedPage) },
      { path: 'fleets', loadComponent: () => import('./pages/fleets').then((m) => m.FleetsPage) },
      { path: 'disputes', loadComponent: () => import('./pages/disputes').then((m) => m.DisputesPage) },
      { path: 'disputes/:id', loadComponent: () => import('./pages/dispute').then((m) => m.DisputePage) },
      { path: 'payments', loadComponent: () => import('./pages/payments').then((m) => m.PaymentsPage) },
      { path: 'notes', loadComponent: () => import('./pages/notes').then((m) => m.NotesPage) },
      { path: 'pilot', loadComponent: () => import('./pages/pilot').then((m) => m.PilotPage) },
      { path: 'integrations', loadComponent: () => import('./pages/integrations').then((m) => m.IntegrationsPage) },
      { path: 'settings', loadComponent: () => import('./pages/settings').then((m) => m.SettingsPage) },
      { path: 'users', loadComponent: () => import('./pages/users').then((m) => m.UsersPage) },
      { path: 'audit', loadComponent: () => import('./pages/audit').then((m) => m.AuditPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
