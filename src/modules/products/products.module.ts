import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { BitacoraModule } from '../bitacora/bitacora.module';
import { RecommendationAgentModule } from '../recommendation-agent/recommendation-agent.module';

@Module({
  imports: [BitacoraModule, RecommendationAgentModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
