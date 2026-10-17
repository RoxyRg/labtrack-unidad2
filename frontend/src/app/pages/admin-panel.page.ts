import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Equipo, Prestamo, mensajeError } from '../core/models';

@Component({
  selector: 'lab-admin-panel',
  imports: [RouterLink],
  template: `
    <div class="page-title"><div><span class="eyebrow">ADMINISTRACIÓN</span><h1>Resumen del laboratorio</h1><p>Estado actual del equipo y las solicitudes de préstamo.</p></div></div>
    @if(error()){<div class="alert error" role="alert">{{error()}}</div>}
    @if(cargando()){<p class="muted">Consultando datos...</p>}
    <div class="stats"><div class="stat"><span>Equipos activos</span><strong>{{equipos().length}}</strong></div><div class="stat"><span>Disponibles</span><strong>{{contarEquipos('DISPONIBLE')}}</strong></div>
      <div class="stat"><span>Prestados</span><strong>{{contarEquipos('PRESTADO')}}</strong></div><div class="stat"><span>Solicitudes pendientes</span><strong>{{contarPrestamos('PENDIENTE')}}</strong></div></div>
    <div class="panel"><h2>Accesos rápidos</h2><div class="quick-links"><a class="btn primary" routerLink="/admin/prestamos">Gestionar préstamos</a><a class="btn secondary" routerLink="/admin/equipos">Inventario</a><a class="btn secondary" routerLink="/admin/categorias">Categorías</a></div></div>
  `,
})
export class AdminPanelPage implements OnInit {
  private readonly api=inject(ApiService);
  readonly equipos=signal<Equipo[]>([]);readonly prestamos=signal<Prestamo[]>([]);
  readonly error=signal('');readonly cargando=signal(true);
  ngOnInit():void{
    forkJoin({equipos:this.api.equipos(),prestamos:this.api.todosPrestamos()}).subscribe({
      next:r=>{this.equipos.set(r.equipos);this.prestamos.set(r.prestamos);this.cargando.set(false);},
      error:e=>{this.error.set(mensajeError(e));this.cargando.set(false);}
    });
  }
  contarEquipos(estado:string):number{return this.equipos().filter(e=>e.estado===estado).length;}
  contarPrestamos(estado:string):number{return this.prestamos().filter(p=>p.estado===estado).length;}
}
