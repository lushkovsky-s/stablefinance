import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { DatadogTraceModule } from 'nestjs-ddtrace';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { configValidationSchema } from './config.schema';
import { FeatureFlagsService } from './feature-flags.service';
import { ThirdPartyApiModule } from './third-party-api/third-party-api.module';
import { HealthModule } from './health/health.module';
import { UserDataModule } from './user-data/user-data.module';
import { PrismaService } from './prisma.service';
import { CacheService } from './cache.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      validationSchema: configValidationSchema,
      isGlobal: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.ENV !== 'prod' ? 'trace' : 'info',
      },
    }),
    DatadogTraceModule.forRoot(),
    AuthModule,
    FeatureFlagsService,
    UserDataModule,
    ThirdPartyApiModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, FeatureFlagsService, PrismaService, CacheService],
})
export class AppModule {}
