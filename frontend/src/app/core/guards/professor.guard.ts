import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Allows only PROFESSOR or ADMIN roles */
export const professorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.role();

  if (role === 'PROFESSOR' || role === 'ADMIN') {
    return true;
  }

  return router.createUrlTree(['/']);
};
