import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Rol } from '@prisma/client';
import type { AuthenticatedRequest } from '../security/authenticated-request';
import { Roles } from '../security/roles.decorator';
import { PrestamosService } from './prestamos.service';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { UpdatePrestamoDto } from './dto/update-prestamo.dto';

@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly prestamos: PrestamosService) {}

  @Roles(Rol.SOLICITANTE)
  @Post()
  solicitar(@Req() req: AuthenticatedRequest, @Body() dto: CreatePrestamoDto) {
    return this.prestamos.solicitar(req.user!.id, dto);
  }

  @Roles(Rol.SOLICITANTE)
  @Get('mios')
  mios(@Req() req: AuthenticatedRequest) {
    return this.prestamos.mios(req.user!.id);
  }

  @Roles(Rol.ADMIN)
  @Get('vencidos')
  vencidos() {
    return this.prestamos.vencidos();
  }

  @Roles(Rol.ADMIN)
  @Get()
  todos() {
    return this.prestamos.todos();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.prestamos.obtener(id, req.user!.id, req.user!.rol);
  }

  @Roles(Rol.SOLICITANTE)
  @Patch(':id')
  editar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest, @Body() dto: UpdatePrestamoDto) {
    return this.prestamos.editar(id, req.user!.id, dto);
  }

  @Roles(Rol.SOLICITANTE)
  @Patch(':id/cancelar')
  cancelar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.prestamos.cancelar(id, req.user!.id);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id/aprobar')
  aprobar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.prestamos.aprobar(id, req.user!.id);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id/rechazar')
  rechazar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.prestamos.rechazar(id, req.user!.id);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id/entregar')
  entregar(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.prestamos.entregar(id, req.user!.id);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id/devolver')
  devolver(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.prestamos.devolver(id, req.user!.id);
  }
}
