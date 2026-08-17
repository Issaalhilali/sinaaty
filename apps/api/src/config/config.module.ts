import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from './env.schema';
import { AppConfig } from './app-config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      envFilePath: ['.env', '.env.local'],
    }),
  ],
  providers: [AppConfig, ConfigService],
  exports: [AppConfig],
})
export class ConfigModule {}
