import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { mensajeError } from '../core/models';

@Component({
  selector: 'lab-login',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="auth-layout">
      <div class="auth-info"><span class="eyebrow">LABTRACK</span><h1>Todo el equipo, en un solo lugar.</h1>
        <p>Consulta la disponibilidad del laboratorio, solicita equipo y da seguimiento a tus préstamos.</p>
        <div class="info-line">Inventario en tiempo real · Historial de préstamos · Control por roles</div>
      </div>
      <form class="panel auth-form" (ngSubmit)="enviar()" #form="ngForm">
        <h2>Iniciar sesión</h2><p class="muted">Ingresa con tu cuenta de LabTrack.</p>
        @if (error()) { <p class="alert error" role="alert">{{error()}}</p> }
        <label>Correo electrónico<input name="correo" type="email" autocomplete="username" [(ngModel)]="correo" required email maxlength="160" /></label>
        <label>Contraseña<input name="password" type="password" autocomplete="current-password" [(ngModel)]="password" required /></label>
        <button type="submit" class="btn primary full" [disabled]="form.invalid || cargando()">{{cargando() ? 'Ingresando...' : 'Entrar'}}</button>
        <p class="muted center">¿Aún no tienes cuenta? <a routerLink="/registro">Regístrate</a></p>
      </form>
    </section>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  correo = '';
  password = '';
  readonly error = signal('');
  readonly cargando = signal(false);
  enviar(): void {
    if (this.cargando()) return;
    this.error.set(''); this.cargando.set(true);
    this.auth.login(this.correo, this.password).subscribe({
      next: (r) => { this.cargando.set(false); void this.router.navigateByUrl(r.usuario.rol === 'ADMIN' ? '/admin/panel' : '/catalogo'); },
      error: (e: unknown) => { this.cargando.set(false); this.error.set(mensajeError(e)); },
    });
  }
}
