import { Module } from '@nestjs/common';
import { BitacoraController } from './bitacora.controller';
import { BitacoraService } from './bitacora.service';

@Module({
  controllers: [BitacoraController],
  providers: [BitacoraService],
  exports: [BitacoraService],
})
export class BitacoraModule {}
