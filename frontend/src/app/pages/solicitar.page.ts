import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Equipo, hoyUtc, sumarDias, mensajeError } from '../core/models';

@Component({
  selector: 'lab-solicitar',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-title"><div><span class="eyebrow">SOLICITANTE</span><h1>Nueva solicitud</h1><p>Selecciona el equipo, las fechas y el motivo del préstamo.</p></div><a routerLink="/mis-prestamos" class="btn secondary">Mis préstamos</a></div>
    <form class="panel form-narrow" (ngSubmit)="enviar()" #form="ngForm">
      @if (error()) {<div class="alert error" role="alert">{{error()}}</div>}
      @if (cargando()) {<p>Cargando equipos...</p>}
      <label>Equipos disponibles <span class="hint">Selecciona uno o varios (máximo 20).</span></label>
      <div class="choice-list">
        @for (e of disponibles(); track e.id) {
          <label class="choice"><input type="checkbox" [checked]="seleccionados.has(e.id)" (change)="alternar(e.id, $any($event.target).checked)" />
            <span><strong>{{e.nombre}}</strong><small>{{e.codigoInventario}} · {{e.marca}} {{e.modelo}}</small></span>
          </label>
        } @empty {<p class="muted">No hay equipos disponibles actualmente.</p>}
      </div>
      <div class="form-grid"><label>Fecha de salida<input type="date" name="fechaSalida" [(ngModel)]="fechaSalida" [min]="minFecha" required /></label>
      <label>Devolución prevista<input type="date" name="fechaDevolucion" [(ngModel)]="fechaDevolucion" [min]="fechaSalida" required /></label></div>
      <label>Motivo<textarea name="motivo" [(ngModel)]="motivo" rows="3" maxlength="1000" required placeholder="Describe el uso que le darás al equipo"></textarea></label>
      <div class="form-actions"><button class="btn primary" type="submit" [disabled]="form.invalid || guardando() || seleccionados.size === 0">{{guardando() ? 'Enviando...' : 'Enviar solicitud'}}</button><a routerLink="/catalogo" class="btn secondary">Cancelar</a></div>
      <p class="muted small">La solicitud quedará PENDIENTE hasta que el encargado la revise.</p>
    </form>
  `,
})
export class SolicitarPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly disponibles = signal<Equipo[]>([]); readonly error = signal('');
  readonly cargando = signal(true); readonly guardando = signal(false);
  readonly seleccionados = new Set<number>();
  readonly minFecha = hoyUtc(); fechaSalida = hoyUtc(); fechaDevolucion = sumarDias(7);
  motivo = '';
  ngOnInit(): void {
    this.api.equipos({estado:'DISPONIBLE'}).subscribe({
      next: equipos=>{
        this.disponibles.set(equipos);
        const elegido = Number(this.route.snapshot.queryParamMap.get('equipo'));
        if (equipos.some(e=>e.id === elegido)) this.seleccionados.add(elegido);
        this.cargando.set(false);
      },
      error: e=>{this.cargando.set(false); this.error.set(mensajeError(e));}
    });
  }
  alternar(id: number, marcado: boolean): void { marcado ? this.seleccionados.add(id) : this.seleccionados.delete(id); }
  enviar(): void {
    if (this.guardando() || !this.seleccionados.size) return;
    this.error.set(''); this.guardando.set(true);
    this.api.solicitar({equipoIds:[...this.seleccionados],fechaSalida:this.fechaSalida,fechaDevolucion:this.fechaDevolucion,motivo:this.motivo}).subscribe({
      next:()=>{this.guardando.set(false); void this.router.navigateByUrl('/mis-prestamos');},
      error:e=>{this.guardando.set(false);this.error.set(mensajeError(e));}
    });
  }
}
