import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Categoria, mensajeError } from '../core/models';

@Component({
  selector: 'lab-admin-categorias',
  imports: [FormsModule],
  template: `
    <div class="page-title"><div><span class="eyebrow">ADMINISTRACIÓN</span><h1>Categorías</h1><p>Organiza los tipos de equipo del laboratorio.</p></div></div>
    @if (error()) {<div class="alert error" role="alert">{{error()}}</div>}
    @if (aviso()) {<div class="alert ok">{{aviso()}}</div>}
    <div class="split-layout"><section class="panel"><h2>{{editandoId===null?'Agregar categoría':'Editar categoría'}}</h2>
      <form (ngSubmit)="guardar()" #form="ngForm">
        <label>Nombre<input name="nombre" [(ngModel)]="nombre" required maxlength="120" /></label>
        <label>Descripción<textarea name="descripcion" [(ngModel)]="descripcion" rows="3"></textarea></label>
        <div class="form-actions"><button class="btn primary" type="submit" [disabled]="form.invalid || ocupada()">{{editandoId===null?'Guardar categoría':'Guardar cambios'}}</button>
          @if (editandoId!==null) {<button class="btn secondary" type="button" (click)="limpiar()">Cancelar edición</button>}</div>
      </form></section>
    <section class="panel"><div class="between"><h2>Registradas ({{categorias().length}})</h2><button type="button" class="btn secondary" (click)="cargar()">Actualizar</button></div>
      <div class="table-scroll"><table><thead><tr><th>ID</th><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead><tbody>
        @for (c of categorias(); track c.id) {<tr><td>{{c.id}}</td><td><strong>{{c.nombre}}</strong></td><td>{{c.descripcion||'—'}}</td><td class="table-actions"><button type="button" class="text-button" (click)="editar(c)">Editar</button><button type="button" class="text-button danger" [disabled]="ocupada()" (click)="eliminar(c)">Eliminar</button></td></tr>}
      </tbody></table></div>
      @if (!categorias().length) {<p class="muted">Aún no hay categorías.</p>}
    </section></div>
  `,
})
export class AdminCategoriasPage implements OnInit {
  private readonly api=inject(ApiService);
  readonly categorias=signal<Categoria[]>([]);readonly error=signal('');readonly aviso=signal('');readonly ocupada=signal(false);
  editandoId:number|null=null;nombre='';descripcion='';
  ngOnInit():void{this.cargar();}
  cargar():void{this.api.categorias().subscribe({next:cs=>this.categorias.set(cs),error:e=>this.error.set(mensajeError(e))});}
  editar(c:Categoria):void{this.editandoId=c.id;this.nombre=c.nombre;this.descripcion=c.descripcion??'';this.error.set('');this.aviso.set('');}
  limpiar():void{this.editandoId=null;this.nombre='';this.descripcion='';}
  guardar():void{
    if(this.ocupada())return;
    this.error.set('');this.aviso.set('');this.ocupada.set(true);
    const operacion=this.editandoId===null ? this.api.crearCategoria({nombre:this.nombre,descripcion:this.descripcion}) : this.api.editarCategoria(this.editandoId,{nombre:this.nombre,descripcion:this.descripcion});
    operacion.subscribe({next:()=>{this.ocupada.set(false);this.limpiar();this.aviso.set('Categoría guardada correctamente.');this.cargar();},error:e=>{this.ocupada.set(false);this.error.set(mensajeError(e));}});
  }
  eliminar(c:Categoria):void{
    if(!confirm(`¿Eliminar la categoría «${c.nombre}»? No se podrá si tiene equipos vinculados.`))return;
    this.ocupada.set(true);this.error.set('');this.aviso.set('');
    this.api.eliminarCategoria(c.id).subscribe({next:()=>{this.ocupada.set(false);this.aviso.set('Categoría eliminada.');this.cargar();},error:e=>{this.ocupada.set(false);this.error.set(mensajeError(e));}});
  }
}
