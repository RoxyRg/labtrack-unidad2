import { Routes } from '@angular/router';
import { autorizado, soloRol } from './core/guards';
import { LoginPage } from './pages/login.page';
import { RegistroPage } from './pages/registro.page';
import { CatalogoPage } from './pages/catalogo.page';
import { SolicitarPage } from './pages/solicitar.page';
import { MisPrestamosPage } from './pages/mis-prestamos.page';
import { AdminCategoriasPage } from './pages/admin-categorias.page';
import { AdminEquiposPage } from './pages/admin-equipos.page';
import { AdminPrestamosPage } from './pages/admin-prestamos.page';
import { AdminPanelPage } from './pages/admin-panel.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalogo' },
  { path: 'login', component: LoginPage },
  { path: 'registro', component: RegistroPage },
  { path: 'catalogo', component: CatalogoPage, canActivate: [autorizado] },
  { path: 'solicitar', component: SolicitarPage, canActivate: [soloRol], data: {roles: ['SOLICITANTE']} },
  { path: 'mis-prestamos', component: MisPrestamosPage, canActivate: [soloRol], data: {roles: ['SOLICITANTE']} },
  { path: 'admin/panel', component: AdminPanelPage, canActivate: [soloRol], data: {roles: ['ADMIN']} },
  { path: 'admin/categorias', component: AdminCategoriasPage, canActivate: [soloRol], data: {roles: ['ADMIN']} },
  { path: 'admin/equipos', component: AdminEquiposPage, canActivate: [soloRol], data: {roles: ['ADMIN']} },
  { path: 'admin/prestamos', component: AdminPrestamosPage, canActivate: [soloRol], data: {roles: ['ADMIN']} },
  { path: '**', redirectTo: 'catalogo' },
];
