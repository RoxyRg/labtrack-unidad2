import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoEquipo, Prisma, Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';

@Injectable()
export class EquiposService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(
    rol: Rol,
    filtros: { q?: string; categoriaId?: string; estado?: string; incluirInactivos?: string },
  ) {
    const where: Prisma.EquipoWhereInput = { activo: true };
    if (filtros.incluirInactivos !== undefined) {
      if (filtros.incluirInactivos !== 'true' && filtros.incluirInactivos !== 'false') {
        throw new BadRequestException('incluirInactivos debe ser true o false');
      }
      if (filtros.incluirInactivos === 'true') {
        if (rol !== Rol.ADMIN) throw new ForbiddenException('Solo ADMIN puede ver equipos inactivos');
        delete where.activo;
      }
    }
    if (filtros.categoriaId !== undefined) {
      const id = Number(filtros.categoriaId);
      if (!Number.isSafeInteger(id) || id <= 0) throw new BadRequestException('categoriaId inválido');
      where.categoriaId = id;
    }
    if (filtros.estado !== undefined) {
      if (!Object.values(EstadoEquipo).includes(filtros.estado as EstadoEquipo)) {
        throw new BadRequestException('Estado de equipo inválido');
      }
      where.estado = filtros.estado as EstadoEquipo;
    }
    if (filtros.q !== undefined) {
      const q = filtros.q.trim();
      if (q.length > 120) throw new BadRequestException('Búsqueda demasiado larga');
      if (q) {
        where.OR = [
          { nombre: { contains: q, mode: 'insensitive' } },
          { codigoInventario: { contains: q, mode: 'insensitive' } },
          { marca: { contains: q, mode: 'insensitive' } },
          { modelo: { contains: q, mode: 'insensitive' } },
        ];
      }
    }
    return this.prisma.equipo.findMany({
      where,
      include: { categoria: { select: { id: true, nombre: true } } },
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    });
  }

  async obtener(id: number, rol: Rol) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { id },
      include: { categoria: { select: { id: true, nombre: true } } },
    });
    if (!equipo || (!equipo.activo && rol !== Rol.ADMIN)) {
      throw new NotFoundException('Equipo no encontrado');
    }
    return equipo;
  }

  async crear(dto: CreateEquipoDto) {
    await this.comprobarCategoria(dto.categoriaId);
    const data = {
      codigoInventario: this.cadena(dto.codigoInventario, 'codigoInventario'),
      nombre: this.cadena(dto.nombre, 'nombre'),
      marca: this.cadena(dto.marca, 'marca'),
      modelo: this.cadena(dto.modelo, 'modelo'),
      numeroSerie: dto.numeroSerie?.trim() || null,
      categoriaId: dto.categoriaId,
      estado: EstadoEquipo.DISPONIBLE,
      activo: true,
    };
    try {
      return await this.prisma.equipo.create({ data });
    } catch (error) {
      this.comprobarUnico(error);
      throw error;
    }
  }

  async actualizar(id: number, dto: UpdateEquipoDto) {
    const equipo = await this.obtener(id, Rol.ADMIN);
    if (!equipo.activo) throw new ConflictException('No se modifica un equipo dado de baja');
    const data: Prisma.EquipoUpdateInput = {};
    if (dto.codigoInventario !== undefined) data.codigoInventario = this.cadena(dto.codigoInventario, 'codigoInventario');
    if (dto.nombre !== undefined) data.nombre = this.cadena(dto.nombre, 'nombre');
    if (dto.marca !== undefined) data.marca = this.cadena(dto.marca, 'marca');
    if (dto.modelo !== undefined) data.modelo = this.cadena(dto.modelo, 'modelo');
    if (dto.numeroSerie !== undefined) data.numeroSerie = dto.numeroSerie?.trim() || null;
    if (dto.categoriaId !== undefined) {
      if (!Number.isInteger(dto.categoriaId) || dto.categoriaId <= 0) {
        throw new BadRequestException('categoriaId inválido');
      }
      await this.comprobarCategoria(dto.categoriaId);
      data.categoria = { connect: { id: dto.categoriaId } };
    }
    try {
      return await this.prisma.equipo.update({ where: { id }, data });
    } catch (error) {
      this.comprobarUnico(error);
      throw error;
    }
  }

  async cambiarEstado(id: number, nuevoEstado: EstadoEquipo) {
    // RESERVADO y PRESTADO solo pueden gestionarse desde el flujo de préstamos.
    if (nuevoEstado !== EstadoEquipo.DISPONIBLE && nuevoEstado !== EstadoEquipo.MANTENIMIENTO) {
      throw new BadRequestException('Este estado se administra mediante préstamos');
    }
    const actualizado = await this.prisma.equipo.updateMany({
      where: {
        id,
        activo: true,
        estado: { in: [EstadoEquipo.DISPONIBLE, EstadoEquipo.MANTENIMIENTO] },
      },
      data: { estado: nuevoEstado },
    });
    if (actualizado.count !== 1) {
      await this.obtener(id, Rol.ADMIN);
      throw new ConflictException('No se puede cambiar el estado de un equipo prestado, reservado o inactivo');
    }
    return this.obtener(id, Rol.ADMIN);
  }

  async eliminar(id: number) {
    const actualizado = await this.prisma.equipo.updateMany({
      where: {
        id,
        activo: true,
        estado: { in: [EstadoEquipo.DISPONIBLE, EstadoEquipo.MANTENIMIENTO] },
      },
      data: { activo: false },
    });
    if (actualizado.count !== 1) {
      const equipo = await this.obtener(id, Rol.ADMIN);
      if (!equipo.activo) throw new ConflictException('El equipo ya fue dado de baja');
      throw new ConflictException('No se puede dar de baja un equipo reservado o prestado');
    }
    return { mensaje: 'Equipo dado de baja sin borrar su historial', id };
  }

  private cadena(valor: string, campo: string) {
    if (typeof valor !== 'string' || !valor.trim()) {
      throw new BadRequestException(`${campo} es obligatorio`);
    }
    return valor.trim();
  }

  private async comprobarCategoria(id: number) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    if (!categoria) throw new BadRequestException('La categoría seleccionada no existe');
  }

  private comprobarUnico(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Código de inventario o número de serie ya registrado');
    }
  }
}
