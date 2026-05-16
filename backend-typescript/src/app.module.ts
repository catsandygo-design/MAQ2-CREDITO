import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FoguetinhoModule } from './modules/foguetinho/foguetinho.module';
import { HealthModule } from './modules/health/health.module';
import { validateEnvironment } from './shared/config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    HealthModule,
    FoguetinhoModule,
  ],
})
export class AppModule {}
