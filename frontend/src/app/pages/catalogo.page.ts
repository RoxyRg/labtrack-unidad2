import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Categoria, Equipo, mensajeError } from '../core/models';

@Component({
  selector: 'lab-catalogo',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-title"><div><span class="eyebrow">INVENTARIO</span><h1>Catálogo de equipos</h1><p>Revisa qué materiales pueden solicitarse para el laboratorio.</p></div><div class="page-actions">
      @if (auth.usuario()?.rol === 'SOLICITANTE') { <a class="btn primary" routerLink="/solicitar">Nueva solicitud</a> }
      @else { <a class="btn primary" routerLink="/admin/equipos">Administrar equipos</a> }
    </div></div>
    <section class="panel filters">
      <label>Buscar<input name="q" placeholder="Nombre, marca o inventario" [(ngModel)]="q" (keyup.enter)="cargar()" maxlength="120" /></label>
      <label>Categoría<select name="categoria" [(ngModel)]="categoriaId" (change)="cargar()"><option [ngValue]="null">Todas</option>@for (c of categorias(); track c.id) {<option [ngValue]="c.id">{{c.nombre}}</option>}</select></label>
      <label>Estado<select name="estado" [(ngModel)]="estado" (change)="cargar()"><option value="">Todos</option><option value="DISPONIBLE">Disponible</option><option value="RESERVADO">Reservado</option><option value="PRESTADO">Prestado</option><option value="MANTENIMIENTO">Mantenimiento</option></select></label>
      <button type="button" class="btn secondary" (click)="cargar()">Buscar</button>
    </section>
    @if (error()) {<div class="alert error" role="alert">{{error()}}</div>}
    <div class="section-top"><h2>Equipos <span class="count">{{equipos().length}}</span></h2></div>
    @if (cargando()) {<p class="muted">Cargando inventario...</p>}
    @else if (!equipos().length) {<div class="empty">No hay equipos que coincidan con los filtros.</div>}
    @else {<div class="cards">
      @for (e of equipos(); track e.id) {
        <article class="equipment-card">
          <div class="equipment-glyph">{{e.nombre.toLowerCase().includes('arduino') ? '⌘' : '▣'}}</div>
          <div class="card-body"><div class="between"><span class="eyebrow">{{e.codigoInventario}}</span><span class="tag" [class.green]="e.estado === 'DISPONIBLE'">{{e.estado}}</span></div>
          <h3>{{e.nombre}}</h3><p class="muted">{{e.marca}} · {{e.modelo}}</p><p class="meta">{{e.categoria?.nombre || 'Sin categoría'}}</p>
          @if (auth.usuario()?.rol === 'SOLICITANTE' && e.estado === 'DISPONIBLE') {<a class="btn secondary full" [routerLink]="['/solicitar']" [queryParams]="{equipo: e.id}">Solicitar equipo</a>}
          </div>
        </article>
      }
    </div>}
  `,
})
export class CatalogoPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly equipos = signal<Equipo[]>([]); readonly categorias = signal<Categoria[]>([]);
  readonly error = signal(''); readonly cargando = signal(true);
  q = ''; categoriaId: number | null = null; estado = '';
  ngOnInit(): void {
    this.api.categorias().subscribe({next: cs=>this.categorias.set(cs), error: e=>this.error.set(mensajeError(e))});
    this.cargar();
  }
  cargar(): void {
    this.cargando.set(true); this.error.set('');
    this.api.equipos({q:this.q, categoriaId:this.categoriaId, estado:this.estado}).subscribe({
      next: es => { this.equipos.set(es); this.cargando.set(false); },
      error: e => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }
}
