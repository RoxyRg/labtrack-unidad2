import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const publicUserSelect = {
  id: true,
  nombre: true,
  matricula: true,
  correo: true,
  rol: true,
  activo: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      return await this.prisma.usuario.create({
        data: {
          nombre: dto.nombre.trim(),
          matricula: dto.matricula?.trim() || null,
          correo: dto.correo.trim().toLowerCase(),
          passwordHash,
          rol: Rol.SOLICITANTE,
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Correo o matricula ya registrados');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo.trim().toLowerCase() },
    });
    if (!usuario || !usuario.activo || !(await bcrypt.compare(dto.password, usuario.passwordHash))) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    const accessToken = await this.jwt.signAsync({ sub: usuario.id, rol: usuario.rol });
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        matricula: usuario.matricula,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    };
  }
}
