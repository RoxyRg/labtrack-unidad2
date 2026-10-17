import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  matricula?: string;

  @IsEmail()
  @MaxLength(160)
  correo!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
