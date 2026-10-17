import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Categoria, Equipo, EquipoPayload, mensajeError } from '../core/models';

@Component({
  selector: 'lab-admin-equipos',
  imports: [FormsModule],
  template: `
    <div class="page-title"><div><span class="eyebrow">ADMINISTRACIÓN</span><h1>Gestión de equipos</h1><p>Altas, edición, mantenimiento y baja lógica de inventario.</p></div></div>
    @if (error()) {<div class="alert error" role="alert">{{error()}}</div>}
    @if (aviso()) {<div class="alert ok">{{aviso()}}</div>}
    <section class="panel"><div class="between"><h2>{{editandoId===null?'Agregar equipo':'Editar equipo #'+editandoId}}</h2>
      @if(editandoId!==null){<button class="text-button" type="button" (click)="limpiar()">Cancelar edición</button>}</div>
      <form (ngSubmit)="guardar()" #form="ngForm">
        <div class="form-grid three"><label>Código de inventario<input name="codigo" [(ngModel)]="formulario.codigoInventario" required maxlength="80" /></label>
        <label>Nombre<input name="nombre" [(ngModel)]="formulario.nombre" required maxlength="160" /></label>
        <label>Categoría<select name="categoria" [(ngModel)]="formulario.categoriaId" required><option [ngValue]="0" disabled>Elegir categoría</option>@for(c of categorias();track c.id){<option [ngValue]="c.id">{{c.nombre}}</option>}</select></label>
        <label>Marca<input name="marca" [(ngModel)]="formulario.marca" required maxlength="100" /></label>
        <label>Modelo<input name="modelo" [(ngModel)]="formulario.modelo" required maxlength="100" /></label>
        <label>Número de serie (opcional)<input name="serie" [(ngModel)]="formulario.numeroSerie" maxlength="120" /></label></div>
        <button class="btn primary" type="submit" [disabled]="form.invalid||formulario.categoriaId<=0||ocupada()">{{editandoId===null?'Registrar equipo':'Guardar cambios'}}</button>
      </form></section>
    <section class="panel"><div class="between"><h2>Inventario ({{equipos().length}})</h2><div class="inline-controls"><label class="inline-check"><input type="checkbox" [(ngModel)]="incluirInactivos" (change)="cargar()" /> Mostrar dados de baja</label><button class="btn secondary" type="button" (click)="cargar()">Actualizar</button></div></div>
      <div class="table-scroll"><table><thead><tr><th>Código</th><th>Equipo</th><th>Categoría</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        @for(e of equipos();track e.id){<tr><td>{{e.codigoInventario}}</td><td><strong>{{e.nombre}}</strong><small>{{e.marca}} · {{e.modelo}}</small></td><td>{{e.categoria?.nombre}}</td>
          <td><span class="tag" [class.green]="e.estado==='DISPONIBLE'&&e.activo">{{e.activo?e.estado:'BAJA'}}</span></td>
          <td class="table-actions">
            @if(e.activo){<button type="button" class="text-button" (click)="editar(e)">Editar</button>
              @if(e.estado==='DISPONIBLE'||e.estado==='MANTENIMIENTO'){
                <button type="button" class="text-button" [disabled]="ocupada()" (click)="cambiarEstado(e)">{{e.estado==='DISPONIBLE'?'Mantenimiento':'Habilitar'}}</button>
                <button type="button" class="text-button danger" [disabled]="ocupada()" (click)="baja(e)">Dar de baja</button>
              }
            } @else {<span class="muted">Histórico</span>}
          </td></tr>}
      </tbody></table></div>
      @if(!equipos().length){<p class="muted">No hay equipos registrados.</p>}
    </section>
  `,
})
export class AdminEquiposPage implements OnInit {
  private readonly api=inject(ApiService);
  readonly equipos=signal<Equipo[]>([]);readonly categorias=signal<Categoria[]>([]);readonly error=signal('');readonly aviso=signal('');readonly ocupada=signal(false);
  formulario:EquipoPayload=this.vacio();editandoId:number|null=null; incluirInactivos=false;
  private vacio():EquipoPayload{return{codigoInventario:'',nombre:'',marca:'',modelo:'',numeroSerie:null,categoriaId:0};}
  ngOnInit():void{this.api.categorias().subscribe({next:cs=>this.categorias.set(cs),error:e=>this.error.set(mensajeError(e))});this.cargar();}
  cargar():void{this.api.equipos({incluirInactivos:this.incluirInactivos}).subscribe({next:es=>this.equipos.set(es),error:e=>this.error.set(mensajeError(e))});}
  editar(e:Equipo):void{this.formulario={codigoInventario:e.codigoInventario,nombre:e.nombre,marca:e.marca,modelo:e.modelo,numeroSerie:e.numeroSerie,categoriaId:e.categoriaId};this.editandoId=e.id;this.error.set('');this.aviso.set('');}
  limpiar():void{this.formulario=this.vacio();this.editandoId=null;}
  guardar():void{
    if(this.ocupada()||this.formulario.categoriaId<=0)return;
    this.ocupada.set(true);this.error.set('');this.aviso.set('');
    const operacion=this.editandoId===null?this.api.crearEquipo(this.formulario):this.api.editarEquipo(this.editandoId,this.formulario);
    operacion.subscribe({next:()=>{this.ocupada.set(false);this.aviso.set('Equipo guardado.');this.limpiar();this.cargar();},error:e=>{this.ocupada.set(false);this.error.set(mensajeError(e));}});
  }
  cambiarEstado(e:Equipo):void{
    const estado=e.estado==='DISPONIBLE'?'MANTENIMIENTO':'DISPONIBLE';
    if(!confirm(`¿Cambiar «${e.nombre}» a ${estado}?`))return;
    this.ocupada.set(true);this.error.set('');this.api.estadoEquipo(e.id,estado).subscribe({next:()=>{this.ocupada.set(false);this.aviso.set('Estado actualizado.');this.cargar();},error:err=>{this.ocupada.set(false);this.error.set(mensajeError(err));}});
  }
  baja(e:Equipo):void{
    if(!confirm(`¿Dar de baja «${e.nombre}»? Su historial se conservará.`))return;
    this.ocupada.set(true);this.error.set('');this.api.bajaEquipo(e.id).subscribe({next:()=>{this.ocupada.set(false);this.aviso.set('Equipo dado de baja.');this.cargar();},error:err=>{this.ocupada.set(false);this.error.set(mensajeError(err));}});
  }
}
