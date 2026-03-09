import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { MailModule } from './modules/mail/mail.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';

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
    PoliciesModule,
    ProductsModule,
    CategoriesModule,
  ],
})
export class AppModule {}
