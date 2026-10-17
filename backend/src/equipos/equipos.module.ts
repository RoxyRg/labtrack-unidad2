import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';

@Module({
  imports: [PrismaModule],
  controllers: [EquiposController],
  providers: [EquiposService],
})
export class EquiposModule {}
