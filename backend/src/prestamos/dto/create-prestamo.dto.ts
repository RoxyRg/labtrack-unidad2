import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsInt, IsNotEmpty, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreatePrestamoDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  equipoIds!: number[];

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaSalida debe tener formato YYYY-MM-DD' })
  fechaSalida!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaDevolucion debe tener formato YYYY-MM-DD' })
  fechaDevolucion!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  motivo!: string;
}
