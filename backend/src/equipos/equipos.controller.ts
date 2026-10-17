import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles } from '../security/roles.decorator';
import type { AuthenticatedRequest } from '../security/authenticated-request';
import { EquiposService } from './equipos.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { UpdateEstadoEquipoDto } from './dto/update-estado-equipo.dto';

@Controller('equipos')
export class EquiposController {
  constructor(private readonly equipos: EquiposService) {}

  @Get()
  listar(
    @Req() request: AuthenticatedRequest,
    @Query('q') q?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('estado') estado?: string,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.equipos.listar(request.user!.rol, { q, categoriaId, estado, incluirInactivos });
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.equipos.obtener(id, request.user!.rol);
  }

  @Roles(Rol.ADMIN)
  @Post()
  crear(@Body() dto: CreateEquipoDto) {
    return this.equipos.crear(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoEquipoDto,
  ) {
    return this.equipos.cambiarEstado(id, dto.estado);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEquipoDto) {
    return this.equipos.actualizar(id, dto);
  }

  @Roles(Rol.ADMIN)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.equipos.eliminar(id);
  }
}
