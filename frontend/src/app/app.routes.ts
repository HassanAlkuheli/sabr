import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { professorGuard } from './core/guards/professor.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'student',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/student/student-layout.component').then(
        (m) => m.StudentLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/student/student-projects.component').then((m) => m.StudentProjectsComponent),
      },
      {
        path: 'running',
        loadComponent: () =>
          import('./pages/student/student-running.component').then((m) => m.StudentRunningComponent),
      },
      {
        path: 'labs',
        loadComponent: () =>
          import('./pages/student/student-labs.component').then((m) => m.StudentLabsComponent),
      },
    ],
  },
  {
    path: 'student-class',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/student/student-class-dashboard.component').then((m) => m.StudentClassDashboardComponent),
  },
  {
    path: 'professor',
    canActivate: [authGuard, professorGuard],
    loadComponent: () =>
      import('./pages/professor/professor-layout.component').then(
        (m) => m.ProfessorLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/professor/professor-projects.component').then((m) => m.ProfessorProjectsComponent),
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./pages/professor/professor-students.component').then((m) => m.ProfessorStudentsComponent),
      },
      {
        path: 'running',
        loadComponent: () =>
          import('./pages/professor/professor-running.component').then((m) => m.ProfessorRunningComponent),
      },
      {
        path: 'labs',
        loadComponent: () =>
          import('./pages/professor/professor-labs.component').then((m) => m.ProfessorLabsComponent),
      },
    ],
  },
  {
    path: 'class-dashboard',
    canActivate: [authGuard, professorGuard],
    loadComponent: () =>
      import('./pages/professor/class-dashboard.component').then((m) => m.ClassDashboardComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/admin/admin-projects.component').then((m) => m.AdminProjectsComponent),
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./pages/admin/admin-students.component').then((m) => m.AdminStudentsComponent),
      },
      {
        path: 'professors',
        loadComponent: () =>
          import('./pages/admin/admin-professors.component').then((m) => m.AdminProfessorsComponent),
      },
      {
        path: 'running',
        loadComponent: () =>
          import('./pages/admin/admin-running.component').then((m) => m.AdminRunningComponent),
      },
      {
        path: 'labs',
        loadComponent: () =>
          import('./pages/admin/admin-labs.component').then((m) => m.AdminLabsComponent),
      },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
