import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.categoria.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { equipos: true } } },
    });
  }

  async obtener(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: { _count: { select: { equipos: true } } },
    });
    if (!categoria) throw new NotFoundException('La categoría no existe');
    return categoria;
  }

  async crear(dto: CreateCategoriaDto) {
    const nombre = dto.nombre.trim();
    if (!nombre) throw new BadRequestException('El nombre no puede estar vacío');
    try {
      return await this.prisma.categoria.create({
        data: { nombre, descripcion: dto.descripcion?.trim() || null },
      });
    } catch (error) {
      this.comprobarUnico(error);
      throw error;
    }
  }

  async actualizar(id: number, dto: UpdateCategoriaDto) {
    await this.obtener(id);
    const data: Prisma.CategoriaUpdateInput = {};
    if (dto.nombre !== undefined) {
      const nombre = dto.nombre.trim();
      if (!nombre) throw new BadRequestException('El nombre no puede estar vacío');
      data.nombre = nombre;
    }
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion?.trim() || null;
    try {
      return await this.prisma.categoria.update({ where: { id }, data });
    } catch (error) {
      this.comprobarUnico(error);
      throw error;
    }
  }

  async eliminar(id: number) {
    await this.obtener(id);
    // Una categoría referenciada debe permanecer para conservar el historial.
    try {
      await this.prisma.categoria.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('No puedes eliminar una categoría con equipos vinculados');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('La categoría no existe');
      }
      throw error;
    }
    return { mensaje: 'Categoría eliminada', id };
  }

  private comprobarUnico(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }
  }
}
