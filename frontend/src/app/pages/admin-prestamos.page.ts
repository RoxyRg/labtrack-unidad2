import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Prestamo, fechaInput, mensajeError } from '../core/models';

@Component({
  selector: 'lab-admin-prestamos',
  template: `
    <div class="page-title"><div><span class="eyebrow">ADMINISTRACIÓN</span><h1>Gestión de préstamos</h1><p>Aprueba, entrega y recibe equipos desde una sola vista.</p></div>
      <button class="btn secondary" type="button" (click)="cargar()">Actualizar</button></div>
    @if(error()){<div class="alert error" role="alert">{{error()}}</div>}
    @if(aviso()){<div class="alert ok">{{aviso()}}</div>}
    <div class="stats"><div class="stat"><span>Pendientes</span><strong>{{contar('PENDIENTE')}}</strong></div><div class="stat"><span>Reservados</span><strong>{{contar('APROBADO')}}</strong></div><div class="stat"><span>Entregados</span><strong>{{contar('ENTREGADO')}}</strong></div><div class="stat"><span>Vencidos</span><strong>{{vencidos().length}}</strong></div></div>
    <section class="panel"><h2>Solicitudes</h2><div class="table-scroll"><table><thead><tr><th>ID</th><th>Solicitante</th><th>Equipo(s)</th><th>Fechas previstas</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      @for(p of prestamos();track p.id){<tr><td>#{{p.id}}</td><td><strong>{{p.solicitante?.nombre||p.solicitanteId}}</strong></td>
        <td>{{equiposTexto(p)}}</td><td>{{fechaInput(p.fechaSalida)}} → {{fechaInput(p.fechaDevolucion)}}</td>
        <td><span class="tag" [class.green]="p.estado==='DEVUELTO'">{{p.estado}}</span></td>
        <td class="table-actions">
          @if(p.estado==='PENDIENTE'){<button class="btn small primary" [disabled]="ocupada()" (click)="accion(p,'aprobar')">Aprobar</button><button class="btn small danger-outline" [disabled]="ocupada()" (click)="accion(p,'rechazar')">Rechazar</button>}
          @if(p.estado==='APROBADO'){<button class="btn small primary" [disabled]="ocupada()" (click)="accion(p,'entregar')">Entregar</button>}
          @if(p.estado==='ENTREGADO'){<button class="btn small primary" [disabled]="ocupada()" (click)="accion(p,'devolver')">Recibir devolución</button>}
          @if(p.estado==='DEVUELTO'||p.estado==='CANCELADO'||p.estado==='RECHAZADO'){<span class="muted">Finalizado</span>}
        </td></tr>}
      </tbody></table></div>@if(!prestamos().length){<p class="muted">Todavía no hay solicitudes.</p>}</section>
    @if(vencidos().length){<section class="panel"><h2>Préstamos vencidos</h2><p class="muted">Equipo entregado cuya fecha de devolución prevista ya transcurrió.</p>
      @for(p of vencidos();track p.id){<div class="overdue">#{{p.id}} · {{p.solicitante?.nombre}} · Plazo: {{fechaInput(p.fechaDevolucion)}}</div>}</section>}
  `,
})
export class AdminPrestamosPage implements OnInit {
  private readonly api=inject(ApiService);
  readonly prestamos=signal<Prestamo[]>([]);readonly vencidos=signal<Prestamo[]>([]);
  readonly error=signal('');readonly aviso=signal('');readonly ocupada=signal(false);
  readonly fechaInput=fechaInput;
  ngOnInit():void{this.cargar();}
  cargar():void{
    this.api.todosPrestamos().subscribe({next:ps=>this.prestamos.set(ps),error:e=>this.error.set(mensajeError(e))});
    this.api.vencidos().subscribe({next:ps=>this.vencidos.set(ps),error:e=>this.error.set(mensajeError(e))});
  }
  contar(estado:string):number{return this.prestamos().filter(p=>p.estado===estado).length;}
  equiposTexto(p:Prestamo):string{return p.detalles.map(d=>d.equipo.nombre).join(', ');}
  accion(p:Prestamo,tipo:'aprobar'|'rechazar'|'entregar'|'devolver'):void{
    if(!confirm(`¿${tipo} la solicitud #${p.id}?`))return;
    this.error.set('');this.aviso.set('');this.ocupada.set(true);
    this.api.accionPrestamo(p.id,tipo).subscribe({next:()=>{this.ocupada.set(false);this.aviso.set('Operación registrada correctamente.');this.cargar();},error:e=>{this.ocupada.set(false);this.error.set(mensajeError(e));this.cargar();}});
  }
}
