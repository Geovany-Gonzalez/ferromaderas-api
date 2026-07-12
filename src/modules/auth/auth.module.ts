import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { BitacoraModule } from '../bitacora/bitacora.module';
import { QuotesModule } from '../quotes/quotes.module';

@Module({
  imports: [
    UsersModule,
    BitacoraModule,
    forwardRef(() => QuotesModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'ferromaderas-secret-change-in-prod',
        signOptions: { expiresIn: '11h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OptionalJwtAuthGuard],
  exports: [AuthService, JwtModule, OptionalJwtAuthGuard],
})
export class AuthModule {}
