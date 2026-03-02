import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { MailModule } from './modules/mail/mail.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    CoreModule,
    MailModule,
    StatisticsModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
