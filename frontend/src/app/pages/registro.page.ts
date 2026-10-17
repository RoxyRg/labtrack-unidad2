import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { mensajeError } from '../core/models';

@Component({
  selector: 'lab-registro',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="auth-layout small-hero">
      <div class="auth-info"><span class="eyebrow">NUEVA CUENTA</span><h1>Acceso al laboratorio.</h1>
        <p>Crea una cuenta de solicitante para consultar y pedir equipo. Los administradores son dados de alta por personal autorizado.</p>
      </div>
      <form class="panel auth-form" (ngSubmit)="enviar()" #form="ngForm">
        <h2>Crear cuenta</h2><p class="muted">El rol asignado será SOLICITANTE.</p>
        @if (error()) { <p class="alert error" role="alert">{{error()}}</p> }
        @if (exito()) { <div class="alert ok">Cuenta creada. <a routerLink="/login">Iniciar sesión</a>.</div> }
        <label>Nombre completo<input name="nombre" [(ngModel)]="nombre" required minlength="2" maxlength="120" /></label>
        <label>Matrícula (opcional para docentes)<input name="matricula" [(ngModel)]="matricula" maxlength="30" /></label>
        <label>Correo electrónico<input name="correo" type="email" autocomplete="username" [(ngModel)]="correo" required email maxlength="160" /></label>
        <label>Contraseña (mínimo 8 caracteres)<input name="password" type="password" autocomplete="new-password" [(ngModel)]="password" required minlength="8" /></label>
        <button type="submit" class="btn primary full" [disabled]="form.invalid || cargando() || exito()">{{cargando() ? 'Registrando...' : 'Crear cuenta'}}</button>
        <p class="muted center">¿Ya tienes cuenta? <a routerLink="/login">Iniciar sesión</a></p>
      </form>
    </section>
  `,
})
export class RegistroPage {
  private readonly auth = inject(AuthService);
  nombre = ''; matricula = ''; correo = ''; password = '';
  readonly error = signal(''); readonly exito = signal(false); readonly cargando = signal(false);
  enviar(): void {
    this.error.set(''); this.cargando.set(true);
    this.auth.registrar({ nombre: this.nombre, matricula: this.matricula || undefined, correo: this.correo, password: this.password }).subscribe({
      next: () => { this.cargando.set(false); this.exito.set(true); this.password = ''; },
      error: (e: unknown) => { this.cargando.set(false); this.error.set(mensajeError(e)); },
    });
  }
}
