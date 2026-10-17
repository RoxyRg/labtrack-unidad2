export type Rol = 'ADMIN' | 'SOLICITANTE';
export type EstadoEquipo = 'DISPONIBLE' | 'RESERVADO' | 'PRESTADO' | 'MANTENIMIENTO';
export type EstadoPrestamo = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO' | 'ENTREGADO' | 'DEVUELTO';

export interface Usuario {
  id: number;
  nombre: string;
  matricula: string | null;
  correo: string;
  rol: Rol;
  activo?: boolean;
}
export interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}
export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
}
export interface Equipo {
  id: number;
  codigoInventario: string;
  nombre: string;
  marca: string;
  modelo: string;
  numeroSerie: string | null;
  categoriaId: number;
  categoria?: Pick<Categoria, 'id' | 'nombre'>;
  estado: EstadoEquipo;
  activo: boolean;
}
export interface DetallePrestamo {
  id: number;
  prestamoId: number;
  equipoId: number;
  observaciones: string | null;
  equipo: Pick<Equipo, 'id' | 'codigoInventario' | 'nombre' | 'estado' | 'activo'>;
}
export interface Prestamo {
  id: number;
  solicitanteId: number;
  atendidoPorId: number | null;
  fechaSalida: string;
  fechaDevolucion: string;
  entregadoEn: string | null;
  devueltoEn: string | null;
  motivo: string;
  estado: EstadoPrestamo;
  detalles: DetallePrestamo[];
  solicitante?: Pick<Usuario, 'id' | 'nombre' | 'matricula'>;
  atendidoPor?: Pick<Usuario, 'id' | 'nombre'> | null;
}
export interface PrestamoPayload {
  equipoIds: number[];
  fechaSalida: string;
  fechaDevolucion: string;
  motivo: string;
}
export interface EquipoPayload {
  codigoInventario: string;
  nombre: string;
  marca: string;
  modelo: string;
  numeroSerie: string | null;
  categoriaId: number;
}
export function mensajeError(error: unknown): string {
  const value = error as { error?: { message?: string | string[] }; status?: number } | null;
  if (value?.status === 0) return 'No se pudo conectar con NestJS. Comprueba que esté activo en el puerto 3002.';
  const mensaje = value?.error?.message;
  if (Array.isArray(mensaje)) return mensaje.join('. ');
  if (typeof mensaje === 'string') return mensaje;
  if (value?.status === 401) return 'Tu sesión no es válida. Inicia sesión de nuevo.';
  if (value?.status === 403) return 'No tienes permiso para realizar esta operación.';
  return 'Ocurrió un error al realizar la operación.';
}
export function fechaInput(value: string): string { return value.slice(0, 10); }
export function hoyUtc(): string { return new Date().toISOString().slice(0, 10); }
export function sumarDias(dias: number): string { return new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10); }
