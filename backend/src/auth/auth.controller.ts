import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Public } from '../security/public.decorator';
import { Roles } from '../security/roles.decorator';
import type { AuthenticatedRequest } from '../security/authenticated-request';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  @Roles(Rol.ADMIN)
  @Get('admin-test')
  adminTest() {
    return { acceso: 'permitido', solo: 'ADMIN' };
  }
}
