import { IsEnum } from 'class-validator';
import { EstadoEquipo } from '@prisma/client';

export class UpdateEstadoEquipoDto {
  @IsEnum(EstadoEquipo)
  estado!: EstadoEquipo;
}
