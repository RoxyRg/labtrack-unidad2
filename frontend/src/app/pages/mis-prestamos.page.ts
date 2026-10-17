import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Equipo, Prestamo, PrestamoPayload, fechaInput, hoyUtc, mensajeError } from '../core/models';

@Component({
  selector: 'lab-mis-prestamos',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-title"><div><span class="eyebrow">SOLICITANTE</span><h1>Mis préstamos</h1><p>Consulta tus solicitudes y el estado de los equipos prestados.</p></div><a class="btn primary" routerLink="/solicitar">Nueva solicitud</a></div>
    @if (error()) {<div class="alert error" role="alert">{{error()}}</div>}
    @if (aviso()) {<div class="alert ok">{{aviso()}}</div>}
    @if (cargando()) {<p class="muted">Cargando préstamos...</p>}
    @else if (!prestamos().length) {<div class="empty">Todavía no has solicitado equipo. <a routerLink="/solicitar">Crear solicitud</a></div>}
    @else {<div class="loan-list">
      @for (p of prestamos(); track p.id) {
        <article class="panel loan-card">
          <div class="between"><div><span class="eyebrow">SOLICITUD #{{p.id}}</span><h3>{{p.detalles.length}} equipo(s)</h3></div><span class="tag" [class.green]="p.estado === 'DEVUELTO' || p.estado === 'APROBADO'">{{p.estado}}</span></div>
          <p class="muted">{{nombreEquipos(p)}}</p><div class="loan-meta"><span>Salida: <strong>{{fechaInput(p.fechaSalida)}}</strong></span><span>Devolución prevista: <strong>{{fechaInput(p.fechaDevolucion)}}</strong></span></div>
          <p>{{p.motivo}}</p>
          @if (p.estado === 'PENDIENTE') {<div class="form-actions"><button type="button" class="btn secondary" (click)="comenzarEdicion(p)">Editar</button><button type="button" class="btn danger-outline" [disabled]="procesando()" (click)="cancelar(p)">Cancelar solicitud</button></div>}
        </article>
      }
    </div>}
    @if (editandoId() !== null) {
      <div class="panel editor"><div class="between"><h2>Editar solicitud #{{editandoId()}}</h2><button type="button" class="text-button" (click)="cerrarEdicion()">Cerrar</button></div>
      <form (ngSubmit)="guardarEdicion()" #form="ngForm">
        <label>Equipos disponibles para esta solicitud</label>
        <div class="choice-list">@for (e of disponibles(); track e.id) {<label class="choice"><input type="checkbox" [checked]="editSeleccionados.has(e.id)" (change)="alternar(e.id,$any($event.target).checked)" /><span>{{e.nombre}} <small>{{e.codigoInventario}}</small></span></label>}</div>
        <div class="form-grid"><label>Fecha de salida<input name="salida" type="date" [(ngModel)]="edicion.fechaSalida" [min]="minFecha" required /></label><label>Devolución prevista<input name="devolucion" type="date" [(ngModel)]="edicion.fechaDevolucion" [min]="edicion.fechaSalida" required /></label></div>
        <label>Motivo<textarea name="motivo" [(ngModel)]="edicion.motivo" required rows="3" maxlength="1000"></textarea></label>
        <button type="submit" class="btn primary" [disabled]="form.invalid || editSeleccionados.size===0 || procesando()">Guardar cambios</button>
      </form></div>
    }
  `,
})
export class MisPrestamosPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly prestamos=signal<Prestamo[]>([]); readonly disponibles=signal<Equipo[]>([]);
  readonly cargando=signal(true); readonly procesando=signal(false); readonly error=signal(''); readonly aviso=signal(''); readonly editandoId=signal<number|null>(null);
  readonly fechaInput=fechaInput; readonly minFecha=hoyUtc();
  edicion: PrestamoPayload={equipoIds:[],fechaSalida:hoyUtc(),fechaDevolucion:hoyUtc(),motivo:''};
  editSeleccionados=new Set<number>();
  ngOnInit(): void { this.cargar(); }
  cargar(): void {
    this.cargando.set(true);
    this.api.misPrestamos().subscribe({next: ps=>{this.prestamos.set(ps);this.cargando.set(false);}, error:e=>{this.error.set(mensajeError(e));this.cargando.set(false);}});
  }
  nombreEquipos(p:Prestamo):string {return p.detalles.map(d=>d.equipo.nombre).join(', ');}
  comenzarEdicion(p:Prestamo):void {
    this.error.set(''); this.aviso.set('');
    this.edicion={equipoIds:p.detalles.map(d=>d.equipoId),fechaSalida:fechaInput(p.fechaSalida),fechaDevolucion:fechaInput(p.fechaDevolucion),motivo:p.motivo};
    this.editSeleccionados=new Set(this.edicion.equipoIds);
    this.api.equipos({estado:'DISPONIBLE'}).subscribe({
      next:es=>{this.disponibles.set(es);this.editandoId.set(p.id);},error:e=>this.error.set(mensajeError(e))
    });
  }
  alternar(id:number, seleccionado:boolean):void { seleccionado?this.editSeleccionados.add(id):this.editSeleccionados.delete(id); }
  cerrarEdicion():void {this.editandoId.set(null);}
  guardarEdicion():void {
    const id=this.editandoId(); if(id===null)return;
    this.procesando.set(true); this.error.set('');
    this.api.editarPrestamo(id,{...this.edicion,equipoIds:[...this.editSeleccionados]}).subscribe({
      next:()=>{this.procesando.set(false);this.editandoId.set(null);this.aviso.set('Solicitud actualizada.');this.cargar();},
      error:e=>{this.procesando.set(false);this.error.set(mensajeError(e));}
    });
  }
  cancelar(p:Prestamo):void {
    if(!confirm(`¿Cancelar la solicitud #${p.id}?`))return;
    this.procesando.set(true);this.error.set('');
    this.api.accionPrestamo(p.id,'cancelar').subscribe({next:()=>{this.procesando.set(false);this.aviso.set('Solicitud cancelada.');this.cargar();},error:e=>{this.procesando.set(false);this.error.set(mensajeError(e));}});
  }
}
