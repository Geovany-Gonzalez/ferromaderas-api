import { Module } from '@nestjs/common';
import { RecommendationAgentController } from './recommendation-agent.controller';
import { RecommendationAgentService } from './recommendation-agent.service';

@Module({
  controllers: [RecommendationAgentController],
  providers: [RecommendationAgentService],
  exports: [RecommendationAgentService],
})
export class RecommendationAgentModule {}
