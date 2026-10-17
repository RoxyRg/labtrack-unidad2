import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Rol } from './models';
export const autorizado: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.token() ? true : inject(Router).createUrlTree(['/login']);
};
export const soloRol: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.token()) return router.createUrlTree(['/login']);
  const roles = route.data['roles'] as Rol[] | undefined;
  return !roles || roles.includes(auth.usuario()!.rol) ? true : router.createUrlTree(['/catalogo']);
};
