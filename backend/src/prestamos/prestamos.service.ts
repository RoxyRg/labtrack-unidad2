import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoEquipo, EstadoPrestamo, Prisma, Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { UpdatePrestamoDto } from './dto/update-prestamo.dto';

const conDetalles = {
  solicitante: { select: { id: true, nombre: true, matricula: true } },
  atendidoPor: { select: { id: true, nombre: true } },
  detalles: {
    include: {
      equipo: {
        select: { id: true, codigoInventario: true, nombre: true, estado: true, activo: true },
      },
    },
  },
} as const;

@Injectable()
export class PrestamosService {
  constructor(private readonly prisma: PrismaService) {}

  // Se usan transacciones serializables y cambios condicionados por estado
  // para evitar reservar o devolver el mismo equipo dos veces.
  private async transaccion<T>(accion: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(accion, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 15000,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Conflicto de operaciones simultáneas; inténtalo de nuevo');
      }
      throw error;
    }
  }

  private fecha(valor: string, nombre: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      throw new BadRequestException(`${nombre} debe tener formato YYYY-MM-DD`);
    }
    const fecha = new Date(`${valor}T00:00:00.000Z`);
    if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
      throw new BadRequestException(`${nombre} no es una fecha válida`);
    }
    return fecha;
  }

  private fechas(salida: string, devolucion: string) {
    const fechaSalida = this.fecha(salida, 'fechaSalida');
    const fechaDevolucion = this.fecha(devolucion, 'fechaDevolucion');
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    if (fechaSalida < hoy || fechaDevolucion < fechaSalida) {
      throw new BadRequestException('Las fechas no pueden estar en el pasado y la devolución debe ser posterior o igual a la salida');
    }
    return { fechaSalida, fechaDevolucion };
  }

  private async equiposDisponibles(tx: Prisma.TransactionClient, ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 20 || new Set(ids).size !== ids.length) {
      throw new BadRequestException('Selecciona entre 1 y 20 equipos distintos');
    }
    const equipos = await tx.equipo.findMany({
      where: { id: { in: ids }, activo: true, estado: EstadoEquipo.DISPONIBLE },
      select: { id: true },
    });
    if (equipos.length !== ids.length) {
      throw new ConflictException('Uno o más equipos no existen, están inactivos o no están disponibles');
    }
  }

  private async pendienteDelUsuario(tx: Prisma.TransactionClient, id: number, solicitanteId: number) {
    const prestamo = await tx.prestamo.findFirst({ where: { id, solicitanteId }, include: { detalles: true } });
    if (!prestamo) throw new NotFoundException('Solicitud no encontrada');
    if (prestamo.estado !== EstadoPrestamo.PENDIENTE) {
      throw new ConflictException('Solo puedes modificar solicitudes pendientes');
    }
    return prestamo;
  }

  async solicitar(solicitanteId: number, dto: CreatePrestamoDto) {
    const fechas = this.fechas(dto.fechaSalida, dto.fechaDevolucion);
    if (!dto.motivo.trim()) throw new BadRequestException('El motivo es obligatorio');
    const creado = await this.transaccion(async (tx) => {
      await this.equiposDisponibles(tx, dto.equipoIds);
      return tx.prestamo.create({
        data: {
          solicitanteId,
          ...fechas,
          motivo: dto.motivo.trim(),
          estado: EstadoPrestamo.PENDIENTE,
          detalles: { create: dto.equipoIds.map((equipoId) => ({ equipoId })) },
        },
        select: { id: true },
      });
    });
    return this.obtener(creado.id, solicitanteId, Rol.SOLICITANTE);
  }

  mios(solicitanteId: number) {
    return this.prisma.prestamo.findMany({
      where: { solicitanteId }, include: conDetalles, orderBy: { id: 'desc' },
    });
  }

  todos() {
    return this.prisma.prestamo.findMany({
      include: conDetalles, orderBy: { id: 'desc' },
    });
  }

  vencidos() {
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    return this.prisma.prestamo.findMany({
      where: { estado: EstadoPrestamo.ENTREGADO, fechaDevolucion: { lt: hoy } },
      include: conDetalles, orderBy: { fechaDevolucion: 'asc' },
    });
  }

  async obtener(id: number, usuarioId: number, rol: Rol) {
    const prestamo = await this.prisma.prestamo.findUnique({ where: { id }, include: conDetalles });
    if (!prestamo || (rol !== Rol.ADMIN && prestamo.solicitanteId !== usuarioId)) {
      throw new NotFoundException('Préstamo no encontrado');
    }
    return prestamo;
  }

  async editar(id: number, solicitanteId: number, dto: UpdatePrestamoDto) {
    await this.transaccion(async (tx) => {
      const previo = await this.pendienteDelUsuario(tx, id, solicitanteId);
      if (!Object.keys(dto).length) throw new BadRequestException('No se proporcionaron cambios');
      const nuevaSalida = dto.fechaSalida ?? previo.fechaSalida.toISOString().slice(0, 10);
      const nuevaDevolucion = dto.fechaDevolucion ?? previo.fechaDevolucion.toISOString().slice(0, 10);
      const fechas = this.fechas(nuevaSalida, nuevaDevolucion);
      if (dto.motivo !== undefined && !dto.motivo.trim()) throw new BadRequestException('El motivo es obligatorio');
      if (dto.equipoIds !== undefined) await this.equiposDisponibles(tx, dto.equipoIds);
      const actualizado = await tx.prestamo.updateMany({
        where: { id, solicitanteId, estado: EstadoPrestamo.PENDIENTE },
        data: {
          ...fechas,
          ...(dto.motivo !== undefined ? { motivo: dto.motivo.trim() } : {}),
        },
      });
      if (actualizado.count !== 1) throw new ConflictException('Esta solicitud ya fue atendida');
      if (dto.equipoIds !== undefined) {
        await tx.detallePrestamo.deleteMany({ where: { prestamoId: id } });
        await tx.detallePrestamo.createMany({
          data: dto.equipoIds.map((equipoId) => ({ prestamoId: id, equipoId })),
        });
      }
    });
    return this.obtener(id, solicitanteId, Rol.SOLICITANTE);
  }

  async cancelar(id: number, solicitanteId: number) {
    const actualizado = await this.prisma.prestamo.updateMany({
      where: { id, solicitanteId, estado: EstadoPrestamo.PENDIENTE },
      data: { estado: EstadoPrestamo.CANCELADO },
    });
    if (actualizado.count !== 1) {
      await this.obtener(id, solicitanteId, Rol.SOLICITANTE);
      throw new ConflictException('Solo se pueden cancelar solicitudes pendientes');
    }
    return this.obtener(id, solicitanteId, Rol.SOLICITANTE);
  }

  async rechazar(id: number, adminId: number) {
    const actualizado = await this.prisma.prestamo.updateMany({
      where: { id, estado: EstadoPrestamo.PENDIENTE },
      data: { estado: EstadoPrestamo.RECHAZADO, atendidoPorId: adminId },
    });
    if (actualizado.count !== 1) {
      await this.obtener(id, adminId, Rol.ADMIN);
      throw new ConflictException('Solo se pueden rechazar solicitudes pendientes');
    }
    return this.obtener(id, adminId, Rol.ADMIN);
  }

  private async cambiarEstadoEquipos(tx: Prisma.TransactionClient, ids: number[], anterior: EstadoEquipo, nuevo: EstadoEquipo) {
    if (!ids.length) throw new ConflictException('El préstamo no tiene equipos');
    for (const id of ids) {
      const actualizado = await tx.equipo.updateMany({
        where: { id, activo: true, estado: anterior },
        data: { estado: nuevo },
      });
      if (actualizado.count !== 1) {
        throw new ConflictException(`Equipo ${id}: el estado cambió; no puede continuarse`);
      }
    }
  }

  async aprobar(id: number, adminId: number) {
    await this.transaccion(async (tx) => {
      const prestamo = await tx.prestamo.findUnique({ where: { id }, include: { detalles: true } });
      if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
      if (prestamo.estado !== EstadoPrestamo.PENDIENTE) throw new ConflictException('Solo se aprueban solicitudes pendientes');
      const actualizado = await tx.prestamo.updateMany({
        where: { id, estado: EstadoPrestamo.PENDIENTE },
        data: { estado: EstadoPrestamo.APROBADO, atendidoPorId: adminId },
      });
      if (actualizado.count !== 1) throw new ConflictException('La solicitud ya fue atendida');
      await this.cambiarEstadoEquipos(tx, prestamo.detalles.map((d) => d.equipoId), EstadoEquipo.DISPONIBLE, EstadoEquipo.RESERVADO);
    });
    return this.obtener(id, adminId, Rol.ADMIN);
  }

  async entregar(id: number, adminId: number) {
    await this.transaccion(async (tx) => {
      const prestamo = await tx.prestamo.findUnique({ where: { id }, include: { detalles: true } });
      if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
      if (prestamo.estado !== EstadoPrestamo.APROBADO) throw new ConflictException('Solo se entregan préstamos aprobados');
      const actualizado = await tx.prestamo.updateMany({
        where: { id, estado: EstadoPrestamo.APROBADO },
        data: { estado: EstadoPrestamo.ENTREGADO, atendidoPorId: adminId, entregadoEn: new Date() },
      });
      if (actualizado.count !== 1) throw new ConflictException('El préstamo cambió de estado');
      await this.cambiarEstadoEquipos(tx, prestamo.detalles.map((d) => d.equipoId), EstadoEquipo.RESERVADO, EstadoEquipo.PRESTADO);
    });
    return this.obtener(id, adminId, Rol.ADMIN);
  }

  async devolver(id: number, adminId: number) {
    await this.transaccion(async (tx) => {
      const prestamo = await tx.prestamo.findUnique({ where: { id }, include: { detalles: true } });
      if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
      if (prestamo.estado !== EstadoPrestamo.ENTREGADO) throw new ConflictException('Solo se reciben préstamos entregados');
      const actualizado = await tx.prestamo.updateMany({
        where: { id, estado: EstadoPrestamo.ENTREGADO },
        data: { estado: EstadoPrestamo.DEVUELTO, atendidoPorId: adminId, devueltoEn: new Date() },
      });
      if (actualizado.count !== 1) throw new ConflictException('El préstamo cambió de estado');
      await this.cambiarEstadoEquipos(tx, prestamo.detalles.map((d) => d.equipoId), EstadoEquipo.PRESTADO, EstadoEquipo.DISPONIBLE);
    });
    return this.obtener(id, adminId, Rol.ADMIN);
  }
}
