import { Module, forwardRef } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { BitacoraModule } from '../bitacora/bitacora.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BitacoraModule, forwardRef(() => AuthModule)],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
