import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="header-inner">
        <a class="brand" routerLink="/catalogo" aria-label="Inicio LabTrack">
          <span class="brand-icon">LT</span><span>Lab<span class="accent">Track</span><small>LABORATORIO UNIVERSITARIO</small></span>
        </a>
        @if (auth.usuario(); as user) {
          <nav class="top-nav" aria-label="Navegación principal">
            <a routerLink="/catalogo" routerLinkActive="active">Catálogo</a>
            @if (user.rol === 'SOLICITANTE') {
              <a routerLink="/solicitar" routerLinkActive="active">Solicitar</a>
              <a routerLink="/mis-prestamos" routerLinkActive="active">Mis préstamos</a>
            } @else {
              <a routerLink="/admin/panel" routerLinkActive="active">Panel</a>
              <a routerLink="/admin/equipos" routerLinkActive="active">Equipos</a>
              <a routerLink="/admin/categorias" routerLinkActive="active">Categorías</a>
              <a routerLink="/admin/prestamos" routerLinkActive="active">Préstamos</a>
            }
          </nav>
          <div class="identity"><span class="pill">{{user.rol}}</span><span class="identity-name">{{user.nombre}}</span>
            <button type="button" class="text-button" (click)="auth.salir()">Salir</button>
          </div>
        } @else {
          <nav class="top-nav"><a routerLink="/login" routerLinkActive="active">Iniciar sesión</a><a routerLink="/registro" routerLinkActive="active">Registro</a></nav>
        }
      </div>
    </header>
    <main class="page-wrap"><router-outlet /></main>
    <footer class="footer">LabTrack · Unidad II · Gestión de equipo de laboratorio</footer>
  `,
})
export class App {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
}
