import { Public } from '../security/public.decorator';
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('db')
  async comprobarBaseDatos() {
    const resultado = await this.prisma.$queryRaw<
      { database: string }[]
    >`SELECT current_database() AS database`;

    const usuarios = await this.prisma.usuario.count();

    return {
      estado: 'ok',
      baseDatos: resultado[0].database,
      usuariosRegistrados: usuarios,
    };
  }
}
