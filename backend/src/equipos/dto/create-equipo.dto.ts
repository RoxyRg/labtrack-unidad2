import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateEquipoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  codigoInventario!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marca!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  modelo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  numeroSerie?: string | null;

  @IsInt()
  @Min(1)
  categoriaId!: number;
}
