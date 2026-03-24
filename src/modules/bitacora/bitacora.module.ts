import { Module } from '@nestjs/common';
import { BitacoraService } from './bitacora.service';

@Module({
  providers: [BitacoraService],
  exports: [BitacoraService],
})
export class BitacoraModule {}
